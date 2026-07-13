import { useEffect, useState } from 'react'
import { exportToBlob } from '@excalidraw/excalidraw'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import { Pencil } from 'lucide-react'
import { getNoteDrawing } from './noteDrawingsApi'
import NoteDrawingEditor from './NoteDrawingEditor'

type SceneElements = ReturnType<ExcalidrawImperativeAPI['getSceneElements']>
type SceneAppState = ReturnType<ExcalidrawImperativeAPI['getAppState']>
type SceneFiles = ReturnType<ExcalidrawImperativeAPI['getFiles']>

interface DrawingEmbedProps {
  workspaceId: string
  noteId: string
  drawingId: string
  title: string
}

function DrawingEmbed({
  workspaceId,
  noteId,
  drawingId,
  title
}: DrawingEmbedProps): React.JSX.Element {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [empty, setEmpty] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null

    async function load(): Promise<void> {
      try {
        const drawing = await getNoteDrawing(workspaceId, noteId, drawingId)
        const elements = (drawing.scene.elements ?? []) as unknown as SceneElements
        if (elements.length === 0) {
          if (!cancelled) setEmpty(true)
          return
        }
        const blob = await exportToBlob({
          elements,
          appState: (drawing.scene.appState ?? {}) as unknown as SceneAppState,
          files: (drawing.scene.files ?? {}) as unknown as SceneFiles,
          mimeType: 'image/png'
        })
        objectUrl = URL.createObjectURL(blob)
        if (!cancelled) setImageUrl(objectUrl)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load drawing')
      }
    }

    load()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
    // Re-run after closing the editor so a save is reflected immediately.
  }, [workspaceId, noteId, drawingId, editing])

  return (
    <>
      <span className="not-prose group relative my-2 inline-block max-w-full rounded-md border border-neutral-700 bg-neutral-900 align-top">
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="max-w-full rounded-md" />
        ) : (
          <span className="flex items-center gap-2 px-4 py-6 text-sm text-neutral-500">
            {error ? error : empty ? `${title} (empty drawing)` : 'Loading drawing…'}
          </span>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`Edit ${title}`}
          className="absolute top-2 right-2 hidden rounded-md bg-neutral-950/80 p-1.5 text-neutral-300 hover:text-neutral-100 group-hover:flex"
        >
          <Pencil size={14} />
        </button>
      </span>
      {editing && (
        <NoteDrawingEditor
          workspaceId={workspaceId}
          noteId={noteId}
          drawingId={drawingId}
          title={title}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  )
}

export default DrawingEmbed
