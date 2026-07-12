import { app, shell, BrowserWindow, ipcMain, globalShortcut, clipboard, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { getApiBaseUrl, startBackend, stopBackend } from './backend'
import { exportNoteFile, importNoteFile, pickResourceFile } from './files'
import fs from 'fs'
import os from 'os'
import { exec, execFile } from 'child_process'

function readSettingsFile(): Record<string, unknown> | null {
  const settingsPath = join(os.homedir(), 'AILearningWorkspace', 'settings.json')
  try {
    if (fs.existsSync(settingsPath)) {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
    }
  } catch (err) {
    console.error('Failed to read settings.json:', err)
  }
  return null
}

function readKeyboardShortcut(key: string, fallback: string): string {
  const data = readSettingsFile()
  const shortcuts = data?.keyboard_shortcuts as Record<string, string> | undefined
  return shortcuts?.[key] || fallback
}

function readSetting(key: string, fallback: string): string {
  const data = readSettingsFile()
  const value = data?.[key]
  return typeof value === 'string' && value ? value : fallback
}

function getGlobalCaptureShortcut(): string {
  return readKeyboardShortcut('global_capture', 'Ctrl+Alt+Shift+C')
}

function getMiniTrayShortcut(): string {
  return readKeyboardShortcut('mini_tray_toggle', 'Ctrl+Alt+Shift+M')
}

function getMiniTraySize(): string {
  return readSetting('mini_tray_size', 'default')
}

// Main-window size/position — kept in its own file rather than
// settings.json since it's a pure Electron/native concern (not something
// the backend needs to know about) and gets written far more often
// (debounced on every resize/move) than an actual settings change.
interface WindowState {
  width: number
  height: number
  x?: number
  y?: number
  isMaximized: boolean
}

const DEFAULT_WINDOW_STATE: WindowState = { width: 1200, height: 800, isMaximized: false }

function getWindowStatePath(): string {
  return join(os.homedir(), 'AILearningWorkspace', 'window-state.json')
}

function loadWindowState(): WindowState {
  try {
    const raw = fs.readFileSync(getWindowStatePath(), 'utf-8')
    const state = JSON.parse(raw) as Partial<WindowState>
    if (typeof state.width !== 'number' || typeof state.height !== 'number') {
      return DEFAULT_WINDOW_STATE
    }
    // If the saved position no longer falls on any connected display (e.g. an
    // external monitor got unplugged), drop x/y and let Electron re-center
    // the window instead of restoring it off-screen and unreachable.
    if (typeof state.x === 'number' && typeof state.y === 'number') {
      const onScreen = screen.getAllDisplays().some((display) => {
        const { x, y, width, height } = display.workArea
        return state.x! >= x && state.y! >= y && state.x! < x + width && state.y! < y + height
      })
      if (!onScreen) {
        delete state.x
        delete state.y
      }
    }
    return { ...DEFAULT_WINDOW_STATE, ...state }
  } catch {
    return DEFAULT_WINDOW_STATE
  }
}

function saveWindowState(win: BrowserWindow): void {
  try {
    const isMaximized = win.isMaximized()
    // getBounds() while maximized returns the maximized bounds, not the
    // user's actual resized size — save the pre-maximize (or last-restored)
    // bounds instead so un-maximizing on the next launch lands back on the
    // size the user actually chose, not whatever the maximized bounds were.
    const bounds = isMaximized ? win.getNormalBounds() : win.getBounds()
    const state: WindowState = { ...bounds, isMaximized }
    fs.mkdirSync(join(os.homedir(), 'AILearningWorkspace'), { recursive: true })
    fs.writeFileSync(getWindowStatePath(), JSON.stringify(state))
  } catch (err) {
    console.error('Failed to save window state:', err)
  }
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

// Read highlighted (primary) selection on Linux without touching the clipboard.
// Tries X11 (xclip) first, then Wayland (wl-paste), then gives up.
function getLinuxPrimarySelection(): Promise<string> {
  return new Promise((resolve) => {
    // X11 path
    exec('xclip -o -selection primary 2>/dev/null', (err, stdout) => {
      if (!err && stdout && stdout.trim()) {
        resolve(stdout.trim())
        return
      }
      // Wayland path
      exec('wl-paste --primary --no-newline 2>/dev/null', (err2, stdout2) => {
        if (!err2 && stdout2 && stdout2.trim()) {
          resolve(stdout2.trim())
        } else {
          resolve('')
        }
      })
    })
  })
}

// On macOS/Windows we simulate Ctrl/Cmd+C to copy the selected text.
// We wait 500ms for the user to release the shortcut keys before sending the
// synthetic copy so modifier keys don't corrupt it.
//
// The clipboard read that follows is a short POLL rather than one fixed-delay
// read: a single read after a flat 350ms silently missed captures whenever the
// source app was slower than that to actually place text on the clipboard.
// Polling resolves the instant a change is observed (fast path for the common
// case) and only falls through to the timeout after genuinely waiting.
function simulateCopyAndRead(oldClipboard: string): Promise<string> {
  return new Promise((resolve) => {
    const RELEASE_DELAY = 500 // ms – wait for shortcut keys to be physically released
    const POLL_INTERVAL = 50 // ms – how often to re-check the clipboard
    const POLL_TIMEOUT = 600 // ms – give up waiting for a change after this long

    setTimeout(() => {
      let command: string
      let args: string[]

      if (process.platform === 'darwin') {
        command = 'osascript'
        args = ['-e', 'tell application "System Events" to keystroke "c" using {command down}']
      } else if (process.platform === 'win32') {
        // Use PowerShell + SendKeys (most reliable way without extra deps).
        // execFile with an args array (not exec with a shell string) is load-
        // bearing here: exec on Windows routes through cmd.exe /c, and the
        // nested double quotes between cmd.exe's parsing and PowerShell's own
        // -Command "..." parsing silently mangle the command — execFile
        // passes args straight to CreateProcess, no shell quoting involved.
        command = 'powershell.exe'
        args = [
          '-NonInteractive',
          '-WindowStyle',
          'Hidden',
          '-Command',
          "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^c')"
        ]
      } else {
        // Linux fallback (xdotool) – should rarely reach here
        command = 'xdotool'
        args = ['key', '--clearmodifiers', 'ctrl+c']
      }

      execFile(command, args, (error, _stdout, stderr) => {
        if (error) {
          console.error('[global-capture] Failed to simulate copy:', error.message, stderr)
        }

        const finish = (text: string): void => {
          // Restore the original clipboard immediately after reading
          if (oldClipboard) {
            clipboard.writeText(oldClipboard)
          } else {
            clipboard.clear()
          }
          resolve(text)
        }

        const startedAt = Date.now()
        const poll = (): void => {
          const current = clipboard.readText().trim()
          if (current && current !== oldClipboard.trim()) {
            console.log(`[global-capture] clipboard changed after ${Date.now() - startedAt}ms`)
            finish(current)
            return
          }
          if (Date.now() - startedAt >= POLL_TIMEOUT) {
            // No observed change within the window — still use whatever is on
            // the clipboard now rather than discarding it. String equality
            // can't reliably tell "copy failed" apart from "copy succeeded
            // with text identical to what was already there" (e.g. capturing
            // the same passage twice in a row), and silently dropping a valid
            // repeat capture was the main source of "sometimes doesn't work."
            console.log(
              `[global-capture] no clipboard change detected within ${POLL_TIMEOUT}ms, using current value (${current ? 'non-empty' : 'empty'})`
            )
            finish(current)
            return
          }
          setTimeout(poll, POLL_INTERVAL)
        }
        poll()
      })
    }, RELEASE_DELAY)
  })
}

async function performGlobalCapture(): Promise<void> {
  let capturedText = ''

  // ── Linux: read highlighted text directly from the primary selection
  //    (X11 stores mouse-highlight in the "primary" buffer without Ctrl+C)
  if (process.platform === 'linux') {
    capturedText = await getLinuxPrimarySelection()
    console.log(
      capturedText
        ? '[global-capture] captured via Linux primary selection'
        : '[global-capture] Linux primary selection empty, falling back to copy-simulation'
    )
  }

  // ── macOS / Windows (or Linux without xclip/wl-paste):
  //    back up clipboard, simulate Ctrl/Cmd+C, read new clipboard, restore.
  if (!capturedText) {
    const oldClipboard = clipboard.readText()
    capturedText = await simulateCopyAndRead(oldClipboard)
  }

  if (!capturedText) {
    console.log('[global-capture] nothing captured (no selection found via any method)')
    return
  }

  // Send text to the main window renderer
  const [mainWindow] = BrowserWindow.getAllWindows()
  if (mainWindow) {
    mainWindow.webContents.send('shortcut:capture-text', capturedText)
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
}

let activeCaptureShortcut = ''

function registerGlobalCapture(): void {
  if (activeCaptureShortcut) {
    globalShortcut.unregister(activeCaptureShortcut)
  }

  const rawShortcut = getGlobalCaptureShortcut()
  const accelerator = mapShortcutToAccelerator(rawShortcut)
  activeCaptureShortcut = accelerator

  try {
    const success = globalShortcut.register(accelerator, performGlobalCapture)

    if (!success) {
      console.error(`Failed to register global capture hotkey: ${accelerator}`)
    }
  } catch (err) {
    console.error('Error during global shortcut registration:', err)
  }
}

const MINI_TRAY_SIZES: Record<string, { width: number; height: number }> = {
  compact: { width: 300, height: 420 },
  default: { width: 353, height: 743 },
  tall: { width: 400, height: 900 }
}
const MINI_TRAY_MARGIN = 24

function getMiniTrayBounds(): { width: number; height: number; x: number; y: number } {
  const { width: displayWidth, height: displayHeight } = screen.getPrimaryDisplay().workAreaSize
  const { width, height } = MINI_TRAY_SIZES[getMiniTraySize()] ?? MINI_TRAY_SIZES.default
  return {
    width,
    height,
    x: displayWidth - width - MINI_TRAY_MARGIN,
    y: displayHeight - height - MINI_TRAY_MARGIN
  }
}

let miniWindow: BrowserWindow | null = null
let lastActiveNote: { workspaceId: string; noteId: string } | null = null
let isQuitting = false

function createMiniWindow(): BrowserWindow {
  const win = new BrowserWindow({
    ...getMiniTrayBounds(),
    resizable: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true
    }
  })

  win.on('close', (event) => {
    // This window is meant to be hidden and reused, not destroyed — toggling
    // it back open should not need to recreate/reload it. Only let it
    // actually close during a real app quit, otherwise preventDefault here
    // would block app.quit() from ever completing.
    if (isQuitting) return
    event.preventDefault()
    win.hide()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}?mode=mini`)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'), { query: { mode: 'mini' } })
  }

  return win
}

function toggleMiniTray(): void {
  if (!miniWindow || miniWindow.isDestroyed()) {
    miniWindow = createMiniWindow()
  }

  if (miniWindow.isVisible()) {
    miniWindow.hide()
    return
  }

  miniWindow.webContents.send('mini:active-note-changed', lastActiveNote)
  miniWindow.show()
  miniWindow.focus()
  miniWindow.webContents.send('mini:focus-requested')
}

function resizeMiniTray(): void {
  if (!miniWindow || miniWindow.isDestroyed()) return
  miniWindow.setBounds(getMiniTrayBounds())
}

let activeMiniTrayShortcut = ''

function registerMiniTrayShortcut(): void {
  if (activeMiniTrayShortcut) {
    globalShortcut.unregister(activeMiniTrayShortcut)
  }

  const accelerator = mapShortcutToAccelerator(getMiniTrayShortcut())
  activeMiniTrayShortcut = accelerator

  try {
    const success = globalShortcut.register(accelerator, toggleMiniTray)
    if (!success) {
      console.error(`Failed to register mini-tray hotkey: ${accelerator}`)
    }
  } catch (err) {
    console.error('Error during mini-tray shortcut registration:', err)
  }
}

// macOS keeps its native traffic-light frame (hiddenInset); Windows/Linux
// get a frameless window so the renderer can draw its own title bar.
const ZOOM_STEP = 0.5
const ZOOM_LIMIT = 4

function createWindow(): void {
  const savedState = loadWindowState()

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: savedState.width,
    height: savedState.height,
    ...(savedState.x !== undefined && savedState.y !== undefined
      ? { x: savedState.x, y: savedState.y }
      : {}),
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    frame: process.platform === 'darwin',
    // Frameless windows are otherwise an opaque rectangle, so the renderer's
    // own rounded corners need a transparent window to actually show through.
    transparent: process.platform !== 'darwin',
    ...(process.platform === 'darwin' ? { titleBarStyle: 'hiddenInset' as const } : {}),
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true
    }
  })

  if (savedState.isMaximized) mainWindow.maximize()

  if (is.dev) {
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
      console.log(`[renderer console] ${message} (from ${sourceId}:${line})`)
    })
  }

  // Debounced so a drag-resize doesn't write on every intermediate frame;
  // 'close' below guarantees a final save even if the debounce never fires.
  let saveStateTimer: ReturnType<typeof setTimeout> | undefined
  const scheduleSaveState = (): void => {
    clearTimeout(saveStateTimer)
    saveStateTimer = setTimeout(() => saveWindowState(mainWindow), 500)
  }
  mainWindow.on('resize', scheduleSaveState)
  mainWindow.on('move', scheduleSaveState)
  mainWindow.on('close', () => {
    clearTimeout(saveStateTimer)
    saveWindowState(mainWindow)
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('closed', () => {
    // The hidden mini-tray window would otherwise keep 'window-all-closed'
    // from ever firing, silently leaving the app running in the background.
    if (process.platform !== 'darwin') app.quit()
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
      registerMiniTrayShortcut()
      resizeMiniTray()
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

    ipcMain.on(
      'active-note:changed',
      (_event, payload: { workspaceId: string; noteId: string } | null) => {
        lastActiveNote = payload
        miniWindow?.webContents.send('mini:active-note-changed', payload)
      }
    )
    ipcMain.handle('active-note:get', () => lastActiveNote)
    ipcMain.on('mini-tray:hide', () => {
      miniWindow?.hide()
    })

    startBackend()
    createWindow()
    registerGlobalCapture()
    registerMiniTrayShortcut()

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
    isQuitting = true
    globalShortcut.unregisterAll()
    stopBackend()
  })
}
