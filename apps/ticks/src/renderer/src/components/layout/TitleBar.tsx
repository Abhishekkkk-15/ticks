import { Copy, Minus, Square, X } from 'lucide-react'
import { useIsMaximized } from '../../lib/useIsMaximized'

const DRAG_REGION = { WebkitAppRegion: 'drag' } as React.CSSProperties
const NO_DRAG_REGION = { WebkitAppRegion: 'no-drag' } as React.CSSProperties

function TitleBar(): React.JSX.Element | null {
  const isMaximized = useIsMaximized()

  if (window.api.platform === 'darwin') return null

  return (
    <div
      className="flex h-8 shrink-0 items-center justify-between border-b border-neutral-800 bg-neutral-950 pl-3 text-neutral-400 select-none"
      style={DRAG_REGION}
      onDoubleClick={() => window.api.windowControls.toggleMaximize()}
    >
      <span className="text-xs font-medium tracking-wide">Ticks</span>
      
      <div className="flex h-full items-stretch" style={NO_DRAG_REGION}>
        <button
          type="button"
          onClick={() => window.api.windowControls.minimize()}
          aria-label="Minimize"
          className="flex w-11 items-center justify-center hover:bg-neutral-800 hover:text-neutral-200"
        >
          <Minus size={14} />
        </button>
        <button
          type="button"
          onClick={() => window.api.windowControls.toggleMaximize()}
          aria-label={isMaximized ? 'Restore' : 'Maximize'}
          className="flex w-11 items-center justify-center hover:bg-neutral-800 hover:text-neutral-200"
        >
          {isMaximized ? <Copy size={12} /> : <Square size={12} />}
        </button>
        <button
          type="button"
          onClick={() => window.api.windowControls.close()}
          aria-label="Close"
          className="flex w-11 items-center justify-center hover:bg-red-600 hover:text-white"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

export default TitleBar
