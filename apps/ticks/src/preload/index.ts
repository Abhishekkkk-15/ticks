import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  getApiBaseUrl: (): Promise<string> => ipcRenderer.invoke('api:get-base-url'),
  getMcpBridgePath: (): Promise<string> => ipcRenderer.invoke('api:get-mcp-bridge-path'),
  exportNote: (defaultName: string, content: string): Promise<boolean> =>
    ipcRenderer.invoke('file:export-note', defaultName, content),
  exportHtml: (defaultName: string, content: string): Promise<boolean> =>
    ipcRenderer.invoke('file:export-html', defaultName, content),
  exportPdf: (defaultName: string, content: string): Promise<boolean> =>
    ipcRenderer.invoke('file:export-pdf', defaultName, content),
  importNote: (): Promise<{ title: string; content: string } | null> =>
    ipcRenderer.invoke('file:import-note'),
  pickResourceFile: (): Promise<{ name: string; data: Uint8Array } | null> =>
    ipcRenderer.invoke('file:pick-resource'),
  openPath: (filePath: string): Promise<string> => ipcRenderer.invoke('shell:open-path', filePath),
  notifySettingsUpdated: (): void => ipcRenderer.send('settings:updated'),
  onCaptureText: (callback: (text: string) => void): (() => void) => {
    const listener = (_event: unknown, text: string): void => callback(text)
    ipcRenderer.on('shortcut:capture-text', listener)
    return (): void => {
      ipcRenderer.off('shortcut:capture-text', listener)
    }
  },
  onClosingSyncRequested: (callback: () => void): (() => void) => {
    const listener = (): void => callback()
    ipcRenderer.on('window:closing-sync-requested', listener)
    return (): void => {
      ipcRenderer.off('window:closing-sync-requested', listener)
    }
  },
  quitApp: (): void => ipcRenderer.send('window:quit'),
  platform: process.platform,
  windowControls: {
    minimize: (): void => ipcRenderer.send('window:minimize'),
    toggleMaximize: (): void => ipcRenderer.send('window:toggle-maximize'),
    close: (): void => ipcRenderer.send('window:close'),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:is-maximized'),
    onMaximizedChange: (callback: (maximized: boolean) => void): (() => void) => {
      const listener = (_event: unknown, maximized: boolean): void => callback(maximized)
      ipcRenderer.on('window:maximized-changed', listener)
      return (): void => {
        ipcRenderer.off('window:maximized-changed', listener)
      }
    }
  },
  notifyActiveNote: (note: { workspaceId: string; noteId: string } | null): void =>
    ipcRenderer.send('active-note:changed', note),
  getActiveNote: (): Promise<{ workspaceId: string; noteId: string } | null> =>
    ipcRenderer.invoke('active-note:get'),
  onActiveNoteChanged: (
    callback: (note: { workspaceId: string; noteId: string } | null) => void
  ): (() => void) => {
    const listener = (
      _event: unknown,
      note: { workspaceId: string; noteId: string } | null
    ): void => callback(note)
    ipcRenderer.on('mini:active-note-changed', listener)
    return (): void => {
      ipcRenderer.off('mini:active-note-changed', listener)
    }
  },
  onMiniFocusRequested: (callback: () => void): (() => void) => {
    const listener = (): void => callback()
    ipcRenderer.on('mini:focus-requested', listener)
    return (): void => {
      ipcRenderer.off('mini:focus-requested', listener)
    }
  },
  hideMiniTray: (): void => ipcRenderer.send('mini-tray:hide')
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
