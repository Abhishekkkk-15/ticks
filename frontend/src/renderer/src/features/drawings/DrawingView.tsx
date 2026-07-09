import { useEffect, useState } from 'react'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import DrawingCanvas from './DrawingCanvas'
import {
  exportDrawingAsExcalidrawFile,
  exportDrawingAsPng,
  exportDrawingAsSvg
} from './exportDrawing'

function DrawingView(): React.JSX.Element {
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    api?.updateScene({ appState: { zenModeEnabled: isFullscreen } })
  }, [api, isFullscreen])

  const exportButtons = [
    { label: 'Export PNG', onClick: () => api && exportDrawingAsPng(api) },
    { label: 'Export SVG', onClick: () => api && exportDrawingAsSvg(api) },
    { label: 'Export Excalidraw', onClick: () => api && exportDrawingAsExcalidrawFile(api) }
  ]

  return (
    <div
      className={
        isFullscreen ? 'fixed inset-0 z-50 flex flex-col bg-neutral-950' : 'flex h-full flex-col'
      }
    >
      <div className="flex shrink-0 items-center justify-between border-b border-neutral-800 px-3 py-2">
        {isFullscreen ? (
          <div />
        ) : (
          <div className="flex items-center gap-1">
            {exportButtons.map((button) => (
              <button
                key={button.label}
                type="button"
                onClick={button.onClick}
                disabled={!api}
                className="rounded-md px-2.5 py-1 text-xs font-medium text-neutral-400 hover:text-neutral-200 disabled:opacity-40"
              >
                {button.label}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="rounded-md px-2.5 py-1 text-xs font-medium text-neutral-400 hover:text-neutral-200"
        >
          {isFullscreen ? 'Exit full screen' : 'Full screen'}
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <DrawingCanvas onApiReady={setApi} />
      </div>
    </div>
  )
}

export default DrawingView
