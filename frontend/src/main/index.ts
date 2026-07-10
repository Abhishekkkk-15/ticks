import { app, shell, BrowserWindow, ipcMain, globalShortcut, clipboard } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { getApiBaseUrl, startBackend, stopBackend } from './backend'
import { exportNoteFile, importNoteFile, pickResourceFile } from './files'
import fs from 'fs'
import os from 'os'
import { exec } from 'child_process'

function getGlobalCaptureShortcut(): string {
  const settingsPath = join(os.homedir(), 'AILearningWorkspace', 'settings.json')
  try {
    if (fs.existsSync(settingsPath)) {
      const data = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
      if (data.keyboard_shortcuts && data.keyboard_shortcuts.global_capture) {
        return data.keyboard_shortcuts.global_capture
      }
    }
  } catch (err) {
    console.error('Failed to read settings for global capture shortcut:', err)
  }
  return 'Ctrl+Alt+Shift+C'
}

function mapShortcutToAccelerator(shortcut: string): string {
  return shortcut
    .split('+')
    .map((part) => {
      if (part === 'Ctrl') return 'CmdOrCtrl'
      if (part === 'Cmd') return 'Cmd'
      return part
    })
    .join('+')
}

function getLinuxPrimarySelection(): Promise<string> {
  return new Promise((resolve) => {
    if (process.platform !== 'linux') {
      resolve('')
      return
    }
    exec('xclip -o -selection primary', (err, stdout) => {
      if (!err && stdout) {
        resolve(stdout.trim())
      } else {
        resolve('')
      }
    })
  })
}

function triggerSystemCopy(): Promise<void> {
  return new Promise((resolve) => {
    // Wait longer (350ms) for the user to release physical modifier keys (Ctrl/Alt/Shift)
    // so they do not corrupt the simulated keystroke
    setTimeout(() => {
      if (process.platform === 'darwin') {
        exec(
          `osascript -e 'tell application "System Events" to keystroke "c" using {command down}'`,
          () => resolve()
        )
      } else if (process.platform === 'win32') {
        const psCommand = `powershell -Command "[void][System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms'); [System.Windows.Forms].SendKeys::SendWait('^c')"`
        exec(psCommand, () => resolve())
      } else if (process.platform === 'linux') {
        exec(`xdotool key ctrl+c`, () => resolve())
      } else {
        resolve()
      }
    }, 350)
  })
}

let activeCaptureShortcut = ''

function registerGlobalCapture(): void {
  // Unregister old shortcut
  if (activeCaptureShortcut) {
    globalShortcut.unregister(activeCaptureShortcut)
  }

  const rawShortcut = getGlobalCaptureShortcut()
  const accelerator = mapShortcutToAccelerator(rawShortcut)
  activeCaptureShortcut = accelerator

  try {
    const success = globalShortcut.register(accelerator, async () => {
      // 1. On Linux, try reading active highlighted text selection directly
      if (process.platform === 'linux') {
        const primaryText = await getLinuxPrimarySelection()
        if (primaryText) {
          const [mainWindow] = BrowserWindow.getAllWindows()
          if (mainWindow) {
            mainWindow.webContents.send('shortcut:capture-text', primaryText)
            if (mainWindow.isMinimized()) mainWindow.restore()
            mainWindow.focus()
          }
          return
        }
      }

      // 2. Backup clipboard
      const oldClipboardText = clipboard.readText()

      // 3. Trigger OS-level copy simulation
      await triggerSystemCopy()

      // 4. Wait a brief moment for clipboard to update, then read selection
      setTimeout(() => {
        const capturedText = clipboard.readText().trim()

        // 5. Restore clipboard contents so user's copy history remains unaffected
        if (oldClipboardText) {
          clipboard.writeText(oldClipboardText)
        }

        // Avoid capturing if copy failed or returned identical text to previous clipboard
        if (!capturedText || capturedText === oldClipboardText.trim()) return

        // 6. Send text to renderer
        const [mainWindow] = BrowserWindow.getAllWindows()
        if (mainWindow) {
          mainWindow.webContents.send('shortcut:capture-text', capturedText)

          // 7. Focus application window
          if (mainWindow.isMinimized()) mainWindow.restore()
          mainWindow.focus()
        }
      }, 150)
    })

    if (!success) {
      console.error(`Failed to register global capture hotkey: ${accelerator}`)
    }
  } catch (err) {
    console.error('Error during global shortcut registration:', err)
  }
}

// macOS keeps its native traffic-light frame (hiddenInset); Windows/Linux
// get a frameless window so the renderer can draw its own title bar.
const ZOOM_STEP = 0.5
const ZOOM_LIMIT = 4

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    frame: process.platform === 'darwin',
    ...(process.platform === 'darwin' ? { titleBarStyle: 'hiddenInset' as const } : {}),
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('maximize', () => mainWindow.webContents.send('window:maximized-changed', true))
  mainWindow.on('unmaximize', () => mainWindow.webContents.send('window:maximized-changed', false))

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown' || !(input.control || input.meta)) return
    const zoom = mainWindow.webContents.getZoomLevel()
    if (input.key === '=' || input.key === '+') {
      event.preventDefault()
      mainWindow.webContents.setZoomLevel(Math.min(zoom + ZOOM_STEP, ZOOM_LIMIT))
    } else if (input.key === '-') {
      event.preventDefault()
      mainWindow.webContents.setZoomLevel(Math.max(zoom - ZOOM_STEP, -ZOOM_LIMIT))
    } else if (input.key === '0') {
      event.preventDefault()
      mainWindow.webContents.setZoomLevel(0)
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// A local-first notes app must not run two instances against the same
// workspace files at once, so the second launch just focuses the first.
const gotSingleInstanceLock = app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const [existingWindow] = BrowserWindow.getAllWindows()
    if (existingWindow) {
      if (existingWindow.isMinimized()) existingWindow.restore()
      existingWindow.focus()
    }
  })

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.whenReady().then(() => {
    electronApp.setAppUserModelId('com.ailearningworkspace.app')

    // Default open or close DevTools by F12 in development
    // and ignore CommandOrControl + R in production.
    // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    ipcMain.handle('api:get-base-url', () => getApiBaseUrl())
    ipcMain.handle('file:export-note', (_event, defaultName: string, content: string) =>
      exportNoteFile(defaultName, content)
    )
    ipcMain.handle('file:import-note', () => importNoteFile())
    ipcMain.handle('file:pick-resource', () => pickResourceFile())

    ipcMain.on('settings:updated', () => {
      registerGlobalCapture()
    })

    ipcMain.on('window:minimize', (event) => {
      BrowserWindow.fromWebContents(event.sender)?.minimize()
    })
    ipcMain.on('window:toggle-maximize', (event) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) return
      if (win.isMaximized()) win.unmaximize()
      else win.maximize()
    })
    ipcMain.on('window:close', (event) => {
      BrowserWindow.fromWebContents(event.sender)?.close()
    })
    ipcMain.handle('window:is-maximized', (event) => {
      return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false
    })

    startBackend()
    createWindow()
    registerGlobalCapture()

    app.on('activate', function () {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  // Quit when all windows are closed, except on macOS. There, it's common
  // for applications and their menu bar to stay active until the user quits
  // explicitly with Cmd + Q.
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('before-quit', () => {
    globalShortcut.unregisterAll()
    stopBackend()
  })
}
