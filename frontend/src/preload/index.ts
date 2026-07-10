import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  getApiBaseUrl: (): Promise<string> => ipcRenderer.invoke('api:get-base-url'),
  exportNote: (defaultName: string, content: string): Promise<boolean> =>
    ipcRenderer.invoke('file:export-note', defaultName, content),
  importNote: (): Promise<{ title: string; content: string } | null> =>
    ipcRenderer.invoke('file:import-note'),
  pickResourceFile: (): Promise<{ name: string; data: Uint8Array } | null> =>
    ipcRenderer.invoke('file:pick-resource'),
  notifySettingsUpdated: (): void => ipcRenderer.send('settings:updated'),
  onCaptureText: (callback: (text: string) => void): (() => void) => {
    const listener = (_event: unknown, text: string): void => callback(text)
    ipcRenderer.on('shortcut:capture-text', listener)
    return (): void => {
      ipcRenderer.off('shortcut:capture-text', listener)
    }
  }
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
