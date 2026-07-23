import { useEffect, useState } from 'react'
import {
  Columns2,
  Expand,
  ExternalLink,
  FileWarning,
  Loader2,
  Maximize2,
  RotateCcw,
  X,
  ZoomIn,
  ZoomOut
} from 'lucide-react'
import { getResourceLocalPath } from './api'
import PdfPreview from './PdfPreview'
import {
  getPreviewKind,
  resourceFileUrl,
  type PreviewKind,
  type PreviewMode
} from './resourcePreviewUtils'
import type { Resource } from './types'

interface ResourcePreviewProps {
  workspaceId: string
  noteId: string
  resource: Resource
  mode: PreviewMode
  onModeChange: (mode: PreviewMode) => void
  onClose: () => void
}

const ZOOM_MIN = 0.5
const ZOOM_MAX = 3
const ZOOM_STEP = 0.25
const ZOOM_DEFAULT = 1

function clampZoom(value: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(value * 100) / 100))
}

function ResourcePreview({
  workspaceId,
  noteId,
  resource,
  mode,
  onModeChange,
  onClose
}: ResourcePreviewProps): React.JSX.Element {
  const kind = getPreviewKind(resource.source)
  const zoomable = kind === 'image' || kind === 'pdf' || kind === 'text'
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [textContent, setTextContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openingExternally, setOpeningExternally] = useState(false)
  const [zoom, setZoom] = useState(ZOOM_DEFAULT)

  useEffect(() => {
    setZoom(ZOOM_DEFAULT)
  }, [resource.id])

  useEffect(() => {
    let cancelled = false

    async function load(): Promise<void> {
      setLoading(true)
      setError(null)
      setTextContent(null)
      try {
        const url = await resourceFileUrl(workspaceId, noteId, resource.id)
        if (cancelled) return
        setFileUrl(url)

        if (kind === 'text') {
          const response = await fetch(url)
          if (!response.ok) throw new Error(`Failed to load file (${response.status})`)
          const text = await response.text()
          if (cancelled) return
          setTextContent(text)
        }
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load preview')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [workspaceId, noteId, resource.id, kind])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (!zoomable) return
      const mod = event.ctrlKey || event.metaKey
      if (!mod) return
      if (event.key === '=' || event.key === '+') {
        event.preventDefault()
        setZoom((z) => clampZoom(z + ZOOM_STEP))
      } else if (event.key === '-') {
        event.preventDefault()
        setZoom((z) => clampZoom(z - ZOOM_STEP))
      } else if (event.key === '0') {
        event.preventDefault()
        setZoom(ZOOM_DEFAULT)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, zoomable])

  async function handleOpenExternally(): Promise<void> {
    setOpeningExternally(true)
    setError(null)
    try {
      const { path } = await getResourceLocalPath(workspaceId, noteId, resource.id)
      const result = await window.api.openPath(path)
      if (result) {
        setError(result)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open file')
    } finally {
      setOpeningExternally(false)
    }
  }

  const zoomPercent = Math.round(zoom * 100)

  return (
    <div className="flex h-full min-h-0 flex-col border-l border-neutral-800 bg-neutral-950">
      <div className="flex shrink-0 items-center gap-2 border-b border-neutral-800 px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium text-neutral-200">{resource.title}</div>
          <div className="truncate text-[10px] text-neutral-500">
            {resource.source} · {kindLabel(kind)}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {zoomable && (
            <>
              <button
                type="button"
                onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))}
                disabled={zoom <= ZOOM_MIN}
                title="Zoom out (Ctrl+-)"
                aria-label="Zoom out"
                className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300 disabled:opacity-40"
              >
                <ZoomOut size={14} />
              </button>
              <button
                type="button"
                onClick={() => setZoom(ZOOM_DEFAULT)}
                title="Reset zoom (Ctrl+0)"
                aria-label={`Zoom ${zoomPercent} percent, click to reset`}
                className="min-w-11 rounded-md px-1.5 py-1 text-[10px] tabular-nums text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
              >
                {zoomPercent}%
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))}
                disabled={zoom >= ZOOM_MAX}
                title="Zoom in (Ctrl+=)"
                aria-label="Zoom in"
                className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300 disabled:opacity-40"
              >
                <ZoomIn size={14} />
              </button>
              {zoom !== ZOOM_DEFAULT && (
                <button
                  type="button"
                  onClick={() => setZoom(ZOOM_DEFAULT)}
                  title="Reset zoom"
                  aria-label="Reset zoom"
                  className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300"
                >
                  <RotateCcw size={13} />
                </button>
              )}
              <div className="mx-1 h-4 w-px bg-neutral-800" />
            </>
          )}
          <button
            type="button"
            onClick={() => onModeChange('split')}
            title="Split view"
            aria-label="Split view"
            className={`rounded-md p-1.5 transition-colors ${
              mode === 'split'
                ? 'bg-neutral-800 text-neutral-100'
                : 'text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300'
            }`}
          >
            <Columns2 size={14} />
          </button>
          <button
            type="button"
            onClick={() => onModeChange('fullscreen')}
            title="Fullscreen"
            aria-label="Fullscreen"
            className={`rounded-md p-1.5 transition-colors ${
              mode === 'fullscreen'
                ? 'bg-neutral-800 text-neutral-100'
                : 'text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300'
            }`}
          >
            <Maximize2 size={14} />
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Close preview"
            aria-label="Close preview"
            className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div
        className="relative min-h-0 flex-1 overflow-hidden"
        onWheel={(event) => {
          if (!zoomable || !(event.ctrlKey || event.metaKey)) return
          event.preventDefault()
          const delta = event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP
          setZoom((z) => clampZoom(z + delta))
        }}
      >
        {loading ? (
          <div className="flex h-full items-center justify-center gap-2 text-xs text-neutral-500">
            <Loader2 size={14} className="animate-spin" />
            Loading preview…
          </div>
        ) : error && kind !== 'unsupported' ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            <FileWarning size={20} className="text-amber-400" />
            <p className="text-xs text-red-400">{error}</p>
          </div>
        ) : kind === 'image' && fileUrl ? (
          <div className="h-full overflow-auto p-4">
            <div className="flex min-h-full items-center justify-center">
              <img
                src={fileUrl}
                alt={resource.title}
                className="object-contain"
                style={{ zoom }}
              />
            </div>
          </div>
        ) : kind === 'pdf' && fileUrl ? (
          <PdfPreview fileUrl={fileUrl} title={resource.title} zoom={zoom} />
        ) : kind === 'text' && textContent !== null ? (
          <pre
            className="h-full overflow-auto p-4 font-mono leading-relaxed whitespace-pre-wrap text-neutral-300"
            style={{ fontSize: `${12 * zoom}px` }}
          >
            {textContent}
          </pre>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <FileWarning size={28} className="text-neutral-500" />
            <div>
              <p className="text-sm text-neutral-300">Preview not available</p>
              <p className="mt-1 text-xs text-neutral-500">
                This file type can’t be previewed in Ticks. Open it with a system app instead.
              </p>
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              type="button"
              onClick={handleOpenExternally}
              disabled={openingExternally}
              className="flex items-center gap-1.5 rounded-md bg-neutral-800 px-3 py-1.5 text-xs text-neutral-200 hover:bg-neutral-700 disabled:opacity-50"
            >
              {openingExternally ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <ExternalLink size={12} />
              )}
              Open with system app
            </button>
          </div>
        )}

        {mode === 'fullscreen' && (
          <div className="pointer-events-none absolute top-2 right-2 rounded-md bg-neutral-900/80 px-2 py-1 text-[10px] text-neutral-500">
            <Expand size={10} className="mr-1 inline" />
            Esc to close
          </div>
        )}
      </div>
    </div>
  )
}

function kindLabel(kind: PreviewKind): string {
  switch (kind) {
    case 'image':
      return 'Image'
    case 'pdf':
      return 'PDF'
    case 'text':
      return 'Text'
    default:
      return 'File'
  }
}

export default ResourcePreview
