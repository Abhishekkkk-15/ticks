import { useState } from 'react'
import { Image as ImageIcon, Pencil, Plus, Trash2 } from 'lucide-react'
import { useNoteDrawings } from './useNoteDrawings'
import NoteDrawingEditor from './NoteDrawingEditor'
import type { Drawing } from './types'

interface NoteDrawingsPanelProps {
  workspaceId: string
  noteId: string
  onInsertEmbed: (drawing: Drawing) => void
}

function NoteDrawingsPanel({
  workspaceId,
  noteId,
  onInsertEmbed
}: NoteDrawingsPanelProps): React.JSX.Element {
  const { drawings, loading, error, create, remove, refresh } = useNoteDrawings(workspaceId, noteId)
  const [newTitle, setNewTitle] = useState('')
  const [editingDrawing, setEditingDrawing] = useState<Drawing | null>(null)

  async function handleCreate(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    const title = newTitle.trim()
    if (!title) return
    setNewTitle('')
    const drawing = await create(title)
    if (drawing) setEditingDrawing(drawing)
  }

  return (
    <div className="border-b border-neutral-800 px-3 py-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium tracking-wide text-neutral-500 uppercase">
          Drawings
        </span>
      </div>

      {loading ? (
        <div className="py-2 text-xs text-neutral-500">Loading…</div>
      ) : drawings.length === 0 ? (
        <div className="py-2 text-xs text-neutral-500">No drawings yet</div>
      ) : (
        <ul className="mb-2 space-y-1">
          {drawings.map((drawing) => (
            <li
              key={drawing.id}
              className="group flex items-center gap-2 rounded-md px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-800"
            >
              <span className="flex min-w-0 flex-1 items-center gap-1.5">
                <ImageIcon size={13} className="shrink-0" />
                <span className="truncate">{drawing.title}</span>
              </span>
              <button
                type="button"
                onClick={() => onInsertEmbed(drawing)}
                className="hidden shrink-0 text-neutral-500 hover:text-neutral-300 group-hover:inline"
              >
                Insert
              </button>
              <button
                type="button"
                onClick={() => setEditingDrawing(drawing)}
                aria-label={`Edit ${drawing.title}`}
                className="shrink-0 text-neutral-500 hover:text-neutral-300"
              >
                <Pencil size={12} />
              </button>
              <button
                type="button"
                onClick={() => remove(drawing.id)}
                aria-label={`Delete ${drawing.title}`}
                className="hidden shrink-0 text-neutral-500 hover:text-red-400 group-hover:inline"
              >
                <Trash2 size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleCreate} className="flex items-center gap-1">
        <input
          value={newTitle}
          onChange={(event) => setNewTitle(event.target.value)}
          placeholder="New drawing…"
          className="min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs text-neutral-200 placeholder:text-neutral-500 focus:ring-1 focus:ring-neutral-500 focus:outline-none"
        />
        <button
          type="submit"
          className="flex shrink-0 items-center gap-1 rounded-md bg-neutral-800 px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-700"
        >
          <Plus size={12} /> Create
        </button>
      </form>

      {error && <div className="mt-2 text-xs text-red-400">{error}</div>}

      {editingDrawing && (
        <NoteDrawingEditor
          workspaceId={workspaceId}
          noteId={noteId}
          drawingId={editingDrawing.id}
          title={editingDrawing.title}
          onClose={() => {
            setEditingDrawing(null)
            refresh()
          }}
        />
      )}
    </div>
  )
}

export default NoteDrawingsPanel
