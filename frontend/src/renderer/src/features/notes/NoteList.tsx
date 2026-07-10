import { useState } from 'react'
import { ArrowLeft, Pin, Star, Upload } from 'lucide-react'
import { useNotes } from './useNotes'
import type { Note } from './types'

interface NoteListProps {
  workspaceId: string
  workspaceName: string
  selectedNoteId?: string
  onBack: () => void
  onOpenNote: (note: Note) => void
}

function NoteList({
  workspaceId,
  workspaceName,
  selectedNoteId,
  onBack,
  onOpenNote
}: NoteListProps): React.JSX.Element {
  const { notes, loading, error, query, setQuery, create, remove, toggleFavorite, importNote } =
    useNotes(workspaceId)
  const [newTitle, setNewTitle] = useState('')

  async function handleCreate(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    const title = newTitle.trim()
    if (!title) return
    setNewTitle('')
    const note = await create(title)
    if (note) onOpenNote(note)
  }

  async function handleImport(): Promise<void> {
    const imported = await window.api.importNote()
    if (!imported) return
    const note = await importNote(imported.title, imported.content)
    if (note) onOpenNote(note)
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center gap-1 border-b border-neutral-800 px-2 py-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to workspaces"
          className="rounded-md p-1 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300"
        >
          <ArrowLeft size={14} />
        </button>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-200">
          {workspaceName}
        </span>
        <button
          type="button"
          onClick={handleImport}
          title="Import Markdown file"
          className="rounded-md p-1 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300"
        >
          <Upload size={14} />
        </button>
      </div>

      <div className="px-2 pt-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search notes…"
          className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
        />
      </div>

      <div className="flex-1 overflow-auto px-2 py-2">
        {loading ? (
          <div className="px-2 py-4 text-center text-sm text-neutral-500">Loading…</div>
        ) : notes.length === 0 ? (
          <div className="px-2 py-4 text-center text-sm text-neutral-500">No notes yet</div>
        ) : (
          <ul className="space-y-0.5">
            {notes.map((note) => (
              <li
                key={note.id}
                className={`group flex items-center justify-between rounded-md px-2 py-1.5 text-sm ${
                  note.id === selectedNoteId
                    ? 'bg-neutral-800 text-neutral-100'
                    : 'text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onOpenNote(note)}
                  className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                >
                  {note.pinned && <Pin size={12} className="shrink-0 text-sky-400" />}
                  <span className="truncate">{note.title}</span>
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggleFavorite(note)}
                    aria-label={note.favorite ? 'Unfavorite' : 'Favorite'}
                    className={
                      note.favorite
                        ? 'text-amber-400'
                        : 'hidden text-neutral-500 hover:text-amber-400 group-hover:inline'
                    }
                  >
                    <Star size={13} fill={note.favorite ? 'currentColor' : 'none'} />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(note.id)}
                    aria-label={`Delete ${note.title}`}
                    className="hidden text-neutral-500 hover:text-red-400 group-hover:inline"
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={handleCreate} className="border-t border-neutral-800 px-2 py-2">
        <input
          value={newTitle}
          onChange={(event) => setNewTitle(event.target.value)}
          placeholder="New note…"
          className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
        />
      </form>

      {error && <div className="px-3 pb-2 text-xs text-red-400">{error}</div>}
    </div>
  )
}

export default NoteList
