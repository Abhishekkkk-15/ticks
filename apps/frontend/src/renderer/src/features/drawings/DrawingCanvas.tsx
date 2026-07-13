import { Excalidraw } from '@excalidraw/excalidraw'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import { useSettings } from '../settings/SettingsContext'

declare global {
  interface Window {
    EXCALIDRAW_ASSET_PATH?: string
  }
}

// Serve Excalidraw's fonts from our own bundle (copied in via electron.vite.config.ts)
// instead of its default esm.sh CDN fallback — this app has no cloud dependency.
// Must be an absolute URL: Excalidraw resolves a relative EXCALIDRAW_ASSET_PATH
// against window.location.origin, which is unreliable for file:// pages in a
// packaged Electron build. document.baseURI reflects the real loaded path in
// both dev (http://localhost:5173/) and production (file://.../index.html).
window.EXCALIDRAW_ASSET_PATH = new URL('excalidraw-assets/', document.baseURI).toString()

interface DrawingCanvasProps {
  onApiReady: (api: ExcalidrawImperativeAPI) => void
}

function DrawingCanvas({ onApiReady }: DrawingCanvasProps): React.JSX.Element {
  const { settings } = useSettings()

  return (
    <div className="h-full w-full">
      <Excalidraw
        excalidrawAPI={onApiReady}
        theme={settings?.theme === 'light' ? 'light' : 'dark'}
      />
    </div>
  )
}

export default DrawingCanvas
