import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowLeft, Clock, List, Pin, RotateCcw, Star, Trash2, Upload, X, RefreshCw, FolderTree, CalendarDays } from 'lucide-react'
import { useNotes } from './useNotes'
import type { NoteView } from './useNotes'
import { setNoteFolder, renameNote } from './api'
import { highlightMatch } from './highlightMatch'
import type { Note } from './types'
import Select from '../../components/ui/Select'
import GitSyncModal from '../workspaces/GitSyncModal'
import NoteTreeList from './NoteTreeList'
import type { ContextMenuTarget } from './NoteTreeList'

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
  const [isGitSyncModalOpen, setIsGitSyncModalOpen] = useState(false)
  const [isTreeView, setIsTreeView] = useState(true)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; target: ContextMenuTarget } | null>(null)
  const [creationPrompt, setCreationPrompt] = useState<{ type: 'note' | 'folder'; folderPath: string | null } | null>(null)
  const [renamePrompt, setRenamePrompt] = useState<{ type: 'note' | 'folder'; targetId: string; currentName: string } | null>(null)
  const [creationName, setCreationName] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  const canCreate = view !== 'recent' && view !== 'trash'
  const canSearch = view !== 'recent' && view !== 'trash'

  useEffect(() => {
    function handleFocusSearch(): void {
      searchInputRef.current?.focus()
    }
    window.addEventListener('sidebar:focus-search', handleFocusSearch)
    return () => window.removeEventListener('sidebar:focus-search', handleFocusSearch)
  }, [])

  useEffect(() => {
    const handleGlobalClick = () => setContextMenu(null)
    window.addEventListener('click', handleGlobalClick)
    return () => window.removeEventListener('click', handleGlobalClick)
  }, [])

  const handleContextMenu = (e: React.MouseEvent, target: ContextMenuTarget) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, target })
  }

  const handleRenameConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!renamePrompt || !creationName.trim()) return
    
    const newName = creationName.trim()
    if (renamePrompt.type === 'note') {
      await renameNote(workspaceId, renamePrompt.targetId, newName)
      window.dispatchEvent(new CustomEvent('notes-updated'))
      window.dispatchEvent(new CustomEvent('note:content-updated', { detail: { noteId: renamePrompt.targetId, content: undefined } }))
    } else {
      const oldPath = renamePrompt.targetId
      const parentPath = oldPath.includes('/') ? oldPath.substring(0, oldPath.lastIndexOf('/')) : null
      const newPath = parentPath ? `${parentPath}/${newName}` : newName
      
      const folderNotes = notes.filter(n => n.folder === oldPath || n.folder?.startsWith(`${oldPath}/`))
      for (const n of folderNotes) {
        let noteNewFolder = newPath
        if (n.folder && n.folder !== oldPath) {
           noteNewFolder = n.folder.replace(oldPath, newPath)
        }
        await setNoteFolder(workspaceId, n.id, noteNewFolder)
      }
      window.dispatchEvent(new CustomEvent('notes-updated'))
    }
    setRenamePrompt(null)
    setCreationName('')
  }

  const handleCreateConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!creationPrompt || !creationName.trim()) return

    const name = creationName.trim()
    
    if (creationPrompt.type === 'folder') {
      const fullFolderPath = creationPrompt.folderPath ? `${creationPrompt.folderPath}/${name}` : name
      const note = await create('Untitled')
      if (note) {
        await setNoteFolder(workspaceId, note.id, fullFolderPath)
        window.dispatchEvent(new CustomEvent('notes-updated'))
      }
    } else {
      const note = await create(name)
      if (note) {
        if (creationPrompt.folderPath) {
          await setNoteFolder(workspaceId, note.id, creationPrompt.folderPath)
          window.dispatchEvent(new CustomEvent('notes-updated'))
        }
        onOpenNote(note)
      }
    }
    setCreationPrompt(null)
    setCreationName('')
  }

  async function handleCreate(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    const title = newTitle.trim()
    if (!title) return
    setNewTitle('')
    const note = await create(title)
    if (note) onOpenNote(note)
  }

  async function handleDailyNote(): Promise<void> {
    const today = new Date().toISOString().split('T')[0]
    const existingNote = notes.find(n => n.title === today)
    if (existingNote) {
      onOpenNote(existingNote as any) // NoteListItem doesn't have full Note fields but onOpenNote just needs ID usually, wait, onOpenNote expects Note. Let's see if we can just pass it. It has id, title, etc.
    } else {
      const note = await create(today)
      if (note) {
        await setNoteFolder(workspaceId, note.id, 'Daily Notes')
        window.dispatchEvent(new CustomEvent('notes-updated'))
        onOpenNote(note)
      }
    }
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
          onClick={handleDailyNote}
          title="Daily Note"
          className="rounded-md p-1 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300"
        >
          <CalendarDays size={14} />
        </button>
        <button
          type="button"
          onClick={handleImport}
          title="Import Markdown file"
          className="rounded-md p-1 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300"
        >
          <Upload size={14} />
        </button>
        <button
          type="button"
          onClick={() => setIsGitSyncModalOpen(true)}
          title="Git Sync Settings & Sync"
          className="rounded-md p-1 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300"
        >
          <RefreshCw size={14} />
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
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setIsTreeView(!isTreeView)}
          title={isTreeView ? 'Switch to List View' : 'Switch to Tree View'}
          className={`rounded-md p-1.5 ${
            isTreeView ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300'
          }`}
        >
          {isTreeView ? <FolderTree size={14} /> : <List size={14} />}
        </button>
      </div>

      {canSearch && (
        <div className="px-2 pt-2">
          <input
            ref={searchInputRef}
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
        ) : isTreeView ? (
          <NoteTreeList
            notes={notes}
            selectedNoteId={selectedNoteId}
            query={query}
            view={view}
            onOpenNote={onOpenNote}
            onToggleFavorite={toggleFavorite}
            onRemove={remove}
            onRestore={restore}
            onPurge={purge}
            onMoveNote={async (noteId, newFolder) => {
              try {
                await setNoteFolder(workspaceId, noteId, newFolder)
                window.dispatchEvent(new CustomEvent('notes-updated'))
              } catch (err) {
                console.error(err)
              }
            }}
            onContextMenu={handleContextMenu}
          />
        ) : (
          <ul className="space-y-0.5" onContextMenu={(e) => handleContextMenu(e, { type: 'root' })}>
            {notes.map((note) => (
              <li
                key={note.id}
                onContextMenu={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleContextMenu(e, { type: 'note', noteId: note.id, noteTitle: note.title })
                }}
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

      {isGitSyncModalOpen && (
        <GitSyncModal
          workspaceId={workspaceId}
          workspaceName={workspaceName}
          onClose={() => setIsGitSyncModalOpen(false)}
        />
      )}

      {contextMenu && createPortal(
        <div 
          className="fixed z-[100] w-48 rounded-md border border-neutral-700 bg-neutral-800 shadow-xl overflow-hidden py-1 text-sm"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation() }}
        >
          {contextMenu.target.type === 'note' && (
            <>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100 transition-colors"
                onClick={() => {
                  const target = contextMenu.target as any
                  setRenamePrompt({ type: 'note', targetId: target.noteId, currentName: target.noteTitle })
                  setCreationName(target.noteTitle)
                  setContextMenu(null)
                }}
              >
                Rename Note
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
                onClick={async () => {
                  const target = contextMenu.target as any
                  if (window.confirm(`Move "${target.noteTitle}" to trash?`)) {
                    await remove(target.noteId)
                  }
                  setContextMenu(null)
                }}
              >
                Delete Note
              </button>
            </>
          )}

          {(contextMenu.target.type === 'folder' || contextMenu.target.type === 'root') && (
            <>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100 transition-colors"
                onClick={() => {
                  const target = contextMenu.target as any
                  setCreationPrompt({ type: 'note', folderPath: contextMenu.target.type === 'folder' ? target.path : null })
                  setContextMenu(null)
                }}
              >
                Create Note
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100 transition-colors"
                onClick={() => {
                  const target = contextMenu.target as any
                  setCreationPrompt({ type: 'folder', folderPath: contextMenu.target.type === 'folder' ? target.path : null })
                  setContextMenu(null)
                }}
              >
                Create Folder
              </button>
            </>
          )}

          {contextMenu.target.type === 'folder' && (
            <>
              <div className="my-1 h-px bg-neutral-700 mx-2" />
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100 transition-colors"
                onClick={() => {
                  const target = contextMenu.target as any
                  const currentName = target.path.split('/').pop()!
                  setRenamePrompt({ type: 'folder', targetId: target.path, currentName })
                  setCreationName(currentName)
                  setContextMenu(null)
                }}
              >
                Rename Folder
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
                onClick={async () => {
                  const target = contextMenu.target as any
                  if (window.confirm(`Delete folder "${target.path}" and all its contents?`)) {
                    const folderPath = target.path
                    const folderNotes = notes.filter(n => n.folder === folderPath || n.folder?.startsWith(`${folderPath}/`))
                    for (const n of folderNotes) {
                      await remove(n.id)
                    }
                  }
                  setContextMenu(null)
                }}
              >
                Delete Folder
              </button>
            </>
          )}
        </div>,
        document.body
      )}

      {(creationPrompt || renamePrompt) && createPortal(
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => {
            setCreationPrompt(null)
            setRenamePrompt(null)
          }}
          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation() }}
        >
          <form 
            onSubmit={renamePrompt ? handleRenameConfirm : handleCreateConfirm}
            className="w-[300px] rounded-lg border border-neutral-800 bg-neutral-900 p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 text-sm font-semibold text-neutral-100">
              {renamePrompt 
                ? `Rename ${renamePrompt.type === 'note' ? 'Note' : 'Folder'}`
                : `Create ${creationPrompt?.type === 'note' ? 'Note' : 'Folder'}${creationPrompt?.folderPath ? ` in ${creationPrompt.folderPath.split('/').pop()}` : ''}`
              }
            </div>
            <input
              autoFocus
              value={creationName}
              onChange={(e) => setCreationName(e.target.value)}
              placeholder={`Enter new name...`}
              className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setCreationPrompt(null)
                  setRenamePrompt(null)
                }}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!creationName.trim() || (renamePrompt ? creationName.trim() === renamePrompt.currentName : false)}
                className="rounded-md bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-900 hover:bg-neutral-200 disabled:opacity-50 transition-colors"
              >
                {renamePrompt ? 'Rename' : 'Create'}
              </button>
            </div>
          </form>
        </div>,
        document.body
      )}
    </div>
  )
}

export default NoteList
