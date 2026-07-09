import { ElectronAPI } from '@electron-toolkit/preload'

interface Api {
  getApiBaseUrl: () => Promise<string>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
