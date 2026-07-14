import { ElectronAPI } from '@electron-toolkit/preload'

export interface ActiveNote {
  workspaceId: string
  noteId: string
}

interface Api {
  getApiBaseUrl: () => Promise<string>
  getMcpBridgePath: () => Promise<string>
  exportNote: (defaultName: string, content: string) => Promise<boolean>
  exportHtml: (defaultName: string, content: string) => Promise<boolean>
  exportPdf: (defaultName: string, content: string) => Promise<boolean>
  importNote: () => Promise<{ title: string; content: string } | null>
  pickResourceFile: () => Promise<{ name: string; data: Uint8Array } | null>
  notifySettingsUpdated: () => void
  onCaptureText: (callback: (text: string) => void) => () => void
  platform: NodeJS.Platform
  windowControls: {
    minimize: () => void
    toggleMaximize: () => void
    close: () => void
    isMaximized: () => Promise<boolean>
    onMaximizedChange: (callback: (maximized: boolean) => void) => () => void
  }
  notifyActiveNote: (note: ActiveNote | null) => void
  getActiveNote: () => Promise<ActiveNote | null>
  onActiveNoteChanged: (callback: (note: ActiveNote | null) => void) => () => void
  onMiniFocusRequested: (callback: () => void) => () => void
  hideMiniTray: () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
