import { useState } from 'react'
import { ArrowLeft, Clock, List, Pin, RotateCcw, Star, Trash2, Upload, X } from 'lucide-react'
import { useNotes } from './useNotes'
import type { NoteView } from './useNotes'
import { highlightMatch } from './highlightMatch'
import type { Note } from './types'
import Select from '../../components/ui/Select'

interface NoteListProps {
  workspaceId: string
  workspaceName: string
  selectedNoteId?: string
  onBack: () => void
  onOpenNote: (note: Note) => void
}

const VIEW_TABS: { id: NoteView; label: string; Icon: typeof List }[] = [
  { id: 'all', label: 'All notes', Icon: List },
  { id: 'favorites', label: 'Favorites', Icon: Star },
  { id: 'pinned', label: 'Pinned', Icon: Pin },
  { id: 'recent', label: 'Recent', Icon: Clock },
  { id: 'trash', label: 'Trash', Icon: Trash2 }
]

const EMPTY_MESSAGES: Record<NoteView, string> = {
  all: 'No notes yet',
  favorites: 'No favorites yet',
  pinned: 'No pinned notes',
  recent: 'No recently opened notes',
  trash: 'Trash is empty'
}

function NoteList({
  workspaceId,
  workspaceName,
  selectedNoteId,
  onBack,
  onOpenNote
}: NoteListProps): React.JSX.Element {
  const {
    notes,
    loading,
    error,
    query,
    setQuery,
    view,
    setView,
    folderFilter,
    setFolderFilter,
    tagFilter,
    setTagFilter,
    folders,
    tags,
    create,
    remove,
    restore,
    purge,
    toggleFavorite,
    importNote
  } = useNotes(workspaceId)
  const [newTitle, setNewTitle] = useState('')

  const canCreate = view !== 'recent' && view !== 'trash'
  const canSearch = view !== 'recent' && view !== 'trash'

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

      <div className="flex items-center gap-0.5 border-b border-neutral-800 px-2 py-1.5">
        {VIEW_TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            title={label}
            aria-pressed={view === id}
            className={`rounded-md p-1.5 ${
              view === id
                ? 'bg-neutral-800 text-neutral-100'
                : 'text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300'
            }`}
          >
            <Icon size={14} />
          </button>
        ))}
      </div>

      {canSearch && (
        <div className="px-2 pt-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search notes…"
            className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
          />
        </div>
      )}

      {(folders.length > 0 || tags.length > 0) && (
        <div className="flex items-center gap-1.5 px-2 pt-2">
          {folders.length > 0 && (
            <Select
              className="min-w-0 flex-1"
              value={folderFilter ?? ''}
              onChange={(value) => setFolderFilter(value || null)}
              options={[
                { value: '', label: 'All folders' },
                ...folders.map((folder) => ({ value: folder, label: folder }))
              ]}
            />
          )}
          {tags.length > 0 && (
            <Select
              className="min-w-0 flex-1"
              value={tagFilter ?? ''}
              onChange={(value) => setTagFilter(value || null)}
              options={[
                { value: '', label: 'All tags' },
                ...tags.map((tag) => ({ value: tag, label: `#${tag}` }))
              ]}
            />
          )}
        </div>
      )}

      <div className="flex-1 overflow-auto px-2 py-2">
        {loading ? (
          <div className="px-2 py-4 text-center text-sm text-neutral-500">Loading…</div>
        ) : notes.length === 0 ? (
          <div className="px-2 py-4 text-center text-sm text-neutral-500">
            {EMPTY_MESSAGES[view]}
          </div>
        ) : (
          <ul className="space-y-0.5">
            {notes.map((note) => (
              <li
                key={note.id}
                className={`group flex items-start justify-between gap-1 rounded-md px-2 py-1.5 text-sm ${
                  note.id === selectedNoteId
                    ? 'bg-neutral-800 text-neutral-100'
                    : 'text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onOpenNote(note)}
                  className="flex min-w-0 flex-1 flex-col items-start text-left"
                >
                  <span className="flex w-full items-center gap-1.5">
                    {note.pinned && <Pin size={12} className="shrink-0 text-sky-400" />}
                    <span className="truncate">{highlightMatch(note.title, query)}</span>
                  </span>
                  {note.snippet && (
                    <span className="w-full truncate text-xs text-neutral-500">
                      {highlightMatch(note.snippet, query)}
                    </span>
                  )}
                </button>
                <div className="flex shrink-0 items-center gap-1 pt-0.5">
                  {view === 'trash' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => restore(note.id)}
                        aria-label={`Restore ${note.title}`}
                        className="text-neutral-500 hover:text-emerald-400"
                      >
                        <RotateCcw size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Permanently delete "${note.title}"?`)) purge(note.id)
                        }}
                        aria-label={`Permanently delete ${note.title}`}
                        className="text-neutral-500 hover:text-red-400"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  ) : (
                    <>
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
                        <X size={13} />
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {canCreate && (
        <form onSubmit={handleCreate} className="border-t border-neutral-800 px-2 py-2">
          <input
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            placeholder="New note…"
            className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
          />
        </form>
      )}

      {error && <div className="px-3 pb-2 text-xs text-red-400">{error}</div>}
    </div>
  )
}

export default NoteList
