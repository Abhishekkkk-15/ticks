import { ElectronAPI } from '@electron-toolkit/preload'

interface Api {
  getApiBaseUrl: () => Promise<string>
  exportNote: (defaultName: string, content: string) => Promise<boolean>
  importNote: () => Promise<{ title: string; content: string } | null>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
