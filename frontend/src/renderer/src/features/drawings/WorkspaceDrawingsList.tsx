import { useEffect, useRef, useState } from 'react'
import { Image as ImageIcon, Plus, Trash2 } from 'lucide-react'
import { useWorkspaceDrawings } from './useWorkspaceDrawings'
import NoteDrawingEditor from './NoteDrawingEditor'
import type { Drawing } from './types'

interface WorkspaceDrawingsListProps {
  workspaceId: string
}

function WorkspaceDrawingsList({ workspaceId }: WorkspaceDrawingsListProps): React.JSX.Element {
  const { drawings, loading, error, create, remove, refresh } = useWorkspaceDrawings(workspaceId)
  const [newTitle, setNewTitle] = useState('')
  const [editingDrawing, setEditingDrawing] = useState<Drawing | null>(null)
  const autoCreateAttemptedRef = useRef(false)

  // If the workspace has no saved drawings at all, skip straight to
  // creating a new one instead of showing an empty list.
  useEffect(() => {
    if (!loading && drawings.length === 0 && !autoCreateAttemptedRef.current && !editingDrawing) {
      autoCreateAttemptedRef.current = true
      create('Untitled Drawing').then((drawing) => {
        if (drawing) setEditingDrawing(drawing)
      })
    }
  }, [loading, drawings.length, editingDrawing, create])

  async function handleCreate(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    const title = newTitle.trim() || 'Untitled Drawing'
    setNewTitle('')
    const drawing = await create(title)
    if (drawing) setEditingDrawing(drawing)
  }

  if (editingDrawing) {
    return (
      <NoteDrawingEditor
        workspaceId={workspaceId}
        noteId={null}
        drawingId={editingDrawing.id}
        title={editingDrawing.title}
        onClose={() => {
          setEditingDrawing(null)
          refresh()
        }}
        showExportTools
      />
    )
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto px-6 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-200">Whiteboard Drawings</h2>
        <form onSubmit={handleCreate} className="flex items-center gap-1">
          <input
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            placeholder="New drawing…"
            className="rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs text-neutral-200 placeholder:text-neutral-500 focus:ring-1 focus:ring-neutral-500 focus:outline-none"
          />
          <button
            type="submit"
            className="flex shrink-0 items-center gap-1 rounded-md bg-neutral-800 px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-700"
          >
            <Plus size={12} /> New Drawing
          </button>
        </form>
      </div>

      {loading ? (
        <div className="py-4 text-center text-sm text-neutral-500">Loading…</div>
      ) : (
        <ul className="space-y-1">
          {drawings.map((drawing) => (
            <li
              key={drawing.id}
              className="group flex items-center gap-2 rounded-md px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
            >
              <button
                type="button"
                onClick={() => setEditingDrawing(drawing)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <ImageIcon size={14} className="shrink-0 text-neutral-500" />
                <span className="truncate">{drawing.title}</span>
              </button>
              <button
                type="button"
                onClick={() => remove(drawing.id)}
                aria-label={`Delete ${drawing.title}`}
                className="hidden shrink-0 rounded p-1 text-neutral-500 hover:bg-neutral-700 hover:text-red-400 group-hover:inline"
              >
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <div className="mt-2 text-xs text-red-400">{error}</div>}
    </div>
  )
}

export default WorkspaceDrawingsList
