import { useState, useMemo } from 'react'
import { ChevronRight, ChevronDown, File, Folder as FolderIcon, Pin, Star, X, RotateCcw, Trash2 } from 'lucide-react'
import type { NoteListItem } from './types'
import { highlightMatch } from './highlightMatch'
import type { NoteView } from './useNotes'

export type ContextMenuTarget =
  | { type: 'root' }
  | { type: 'folder'; path: string }
  | { type: 'note'; noteId: string; noteTitle: string }

interface NoteTreeListProps {
  notes: NoteListItem[]
  selectedNoteId?: string
  query: string
  view: NoteView
  onOpenNote: (note: NoteListItem) => void
  onToggleFavorite: (note: NoteListItem) => void
  onRemove: (id: string) => void
  onRestore: (id: string) => void
  onPurge: (id: string) => void
  onMoveNote: (noteId: string, newFolder: string | null) => void
  onContextMenu: (e: React.MouseEvent, target: ContextMenuTarget) => void
}

interface TreeFolder {
  name: string
  path: string
  children: Record<string, TreeFolder>
  notes: NoteListItem[]
}

export default function NoteTreeList({
  notes,
  selectedNoteId,
  query,
  view,
  onOpenNote,
  onToggleFavorite,
  onRemove,
  onRestore,
  onPurge,
  onMoveNote,
  onContextMenu
}: NoteTreeListProps): React.JSX.Element {
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({})

  const toggleFolder = (path: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedFolders((prev) => ({ ...prev, [path]: !prev[path] }))
  }

  const handleDragStart = (e: React.DragEvent, noteId: string) => {
    e.dataTransfer.setData('application/ticks-note-id', noteId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/ticks-note-id')) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      e.currentTarget.classList.add('bg-neutral-800/40')
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('bg-neutral-800/40')
  }

  const handleDropFolder = (e: React.DragEvent, folderPath: string) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.classList.remove('bg-neutral-800/40')
    const noteId = e.dataTransfer.getData('application/ticks-note-id')
    if (noteId) onMoveNote(noteId, folderPath)
  }

  const handleDropRoot = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.remove('bg-neutral-800/40')
    const noteId = e.dataTransfer.getData('application/ticks-note-id')
    if (noteId) onMoveNote(noteId, null)
  }

  const root = useMemo(() => {
    const rootNode: TreeFolder = { name: 'root', path: '', children: {}, notes: [] }
    
    for (const note of notes) {
      if (!note.folder) {
        rootNode.notes.push(note)
        continue
      }
      
      const parts = note.folder.split('/').filter(Boolean)
      let current = rootNode
      let currentPath = ''
      
      for (const part of parts) {
        currentPath = currentPath ? `${currentPath}/${part}` : part
        if (!current.children[part]) {
          current.children[part] = { name: part, path: currentPath, children: {}, notes: [] }
        }
        current = current.children[part]
      }
      current.notes.push(note)
    }
    
    return rootNode
  }, [notes])

  const renderNote = (note: NoteListItem, depth: number) => (
    <div
      key={note.id}
      draggable
      onDragStart={(e) => handleDragStart(e, note.id)}
      onContextMenu={(e) => onContextMenu(e, { type: 'note', noteId: note.id, noteTitle: note.title })}
      className={`group flex items-start justify-between gap-1 rounded-md px-2 py-1.5 text-sm ${
        note.id === selectedNoteId
          ? 'bg-neutral-800 text-neutral-100'
          : 'text-neutral-300 hover:bg-neutral-800'
      }`}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
    >
      <button
        type="button"
        onClick={() => onOpenNote(note)}
        className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
      >
        <File size={14} className="shrink-0 text-neutral-500" />
        <span className="flex w-full items-center gap-1.5 truncate">
          {note.pinned && <Pin size={12} className="shrink-0 text-sky-400" />}
          <span className="truncate">{highlightMatch(note.title, query)}</span>
        </span>
      </button>
      <div className="flex shrink-0 items-center gap-1 pt-0.5">
        {view === 'trash' ? (
          <>
            <button
              type="button"
              onClick={() => onRestore(note.id)}
              aria-label={`Restore ${note.title}`}
              className="text-neutral-500 hover:text-emerald-400"
            >
              <RotateCcw size={13} />
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Permanently delete "${note.title}"?`)) onPurge(note.id)
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
              onClick={() => onToggleFavorite(note)}
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
              onClick={() => onRemove(note.id)}
              aria-label={`Delete ${note.title}`}
              className="hidden text-neutral-500 hover:text-red-400 group-hover:inline"
            >
              <X size={13} />
            </button>
          </>
        )}
      </div>
    </div>
  )

  const renderFolder = (folder: TreeFolder, depth: number) => {
    const isExpanded = expandedFolders[folder.path] !== false
    const hasChildren = Object.keys(folder.children).length > 0 || folder.notes.length > 0
    
    if (!hasChildren) return null

    const expanded = query ? true : isExpanded

    return (
      <div key={folder.path} className="flex flex-col">
        <button
          type="button"
          onClick={(e) => toggleFolder(folder.path, e)}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDropFolder(e, folder.path)}
          onContextMenu={(e) => onContextMenu(e, { type: 'folder', path: folder.path })}
          className="flex items-center gap-1.5 rounded-md py-1.5 px-2 text-sm text-neutral-300 hover:bg-neutral-800 transition-colors"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {expanded ? <ChevronDown size={14} className="shrink-0" /> : <ChevronRight size={14} className="shrink-0" />}
          <FolderIcon size={14} className="shrink-0 text-blue-400" />
          <span className="truncate pointer-events-none">{folder.name}</span>
        </button>
        
        {expanded && (
          <div className="flex flex-col">
            {Object.values(folder.children).map(child => renderFolder(child, depth + 1))}
            {folder.notes.map(note => renderNote(note, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div 
      className="flex flex-col w-full space-y-0.5 min-h-full pb-16"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDropRoot}
      onContextMenu={(e) => onContextMenu(e, { type: 'root' })}
    >
      {Object.values(root.children).map(folder => renderFolder(folder, 0))}
      {root.notes.map(note => renderNote(note, 0))}
    </div>
  )
}
