import { useState } from 'react'
import { Copy, Download, Image, Paperclip, Pencil, Pin, PinOff, Star, Trash2 } from 'lucide-react'
import EditorView from '../editor/EditorView'
import { useNoteEditor } from './useNoteEditor'
import { deleteNote, duplicateNote, renameNote, setNoteFlags } from './api'
import ResourcesPanel from '../resources/ResourcesPanel'
import NoteDrawingsPanel from '../drawings/NoteDrawingsPanel'
import type { Drawing } from '../drawings/types'
import type { Note } from './types'

interface NoteEditorProps {
  workspaceId: string
  noteId: string
  onDeleted: () => void
  onDuplicated: (note: Note) => void
}

const saveStatusLabels: Record<string, string> = {
  idle: '',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Failed to save'
}

function NoteEditor({
  workspaceId,
  noteId,
  onDeleted,
  onDuplicated
}: NoteEditorProps): React.JSX.Element {
  const { note, content, onChange, loading, error, saveStatus } = useNoteEditor(workspaceId, noteId)
  const [meta, setMeta] = useState<Note | null>(null)
  const [renaming, setRenaming] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [loadedNoteId, setLoadedNoteId] = useState<string | null>(null)
  const [activePanel, setActivePanel] = useState<'resources' | 'drawings' | null>(null)

  // Reset local draft state when a different note finishes loading, without
  // the extra render + flicker an effect-based sync would cause.
  if (note && note.id !== loadedNoteId) {
    setLoadedNoteId(note.id)
    setMeta(note)
    setTitleDraft(note.title)
    setRenaming(false)
  }

  async function commitRename(): Promise<void> {
    setRenaming(false)
    const title = titleDraft.trim()
    if (!meta || !title || title === meta.title) return
    setMeta(await renameNote(workspaceId, meta.id, title))
  }

  async function toggleFavorite(): Promise<void> {
    if (!meta) return
    setMeta(await setNoteFlags(workspaceId, meta.id, { favorite: !meta.favorite }))
  }

  async function togglePin(): Promise<void> {
    if (!meta) return
    setMeta(await setNoteFlags(workspaceId, meta.id, { pinned: !meta.pinned }))
  }

  async function handleDuplicate(): Promise<void> {
    if (!meta) return
    onDuplicated(await duplicateNote(workspaceId, meta.id))
  }

  async function handleDelete(): Promise<void> {
    if (!meta) return
    if (!window.confirm(`Delete "${meta.title}"? This can't be undone.`)) return
    await deleteNote(workspaceId, meta.id)
    onDeleted()
  }

  async function handleExport(): Promise<void> {
    if (!meta) return
    await window.api.exportNote(`${meta.title}.md`, content)
  }

  function handleInsertDrawingEmbed(drawing: Drawing): void {
    const separator = content.endsWith('\n') || content === '' ? '' : '\n\n'
    onChange(`${content}${separator}![${drawing.title}](drawing://${drawing.id})\n`)
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-500">
        Loading…
      </div>
    )
  }

  if (error || !meta) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-red-400">
        {error ?? 'Note not found'}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-neutral-800 px-3 py-2">
        {renaming ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={(event) => setTitleDraft(event.target.value)}
            onBlur={commitRename}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commitRename()
              if (event.key === 'Escape') setRenaming(false)
            }}
            className="min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-500"
          />
        ) : (
          <button
            type="button"
            onClick={() => setRenaming(true)}
            className="min-w-0 flex-1 truncate text-left text-sm font-medium text-neutral-200 hover:text-neutral-100"
          >
            {meta.title}
          </button>
        )}

        <div className="flex shrink-0 items-center gap-2 text-neutral-500">
          <span className="text-xs text-neutral-500">{saveStatusLabels[saveStatus]}</span>
          <button
            type="button"
            onClick={toggleFavorite}
            title="Favorite"
            className={meta.favorite ? 'text-amber-400' : 'hover:text-neutral-300'}
          >
            <Star size={16} fill={meta.favorite ? 'currentColor' : 'none'} />
          </button>
          <button
            type="button"
            onClick={togglePin}
            title="Pin"
            className={meta.pinned ? 'text-sky-400' : 'hover:text-neutral-300'}
          >
            {meta.pinned ? <PinOff size={16} /> : <Pin size={16} />}
          </button>
          <button
            type="button"
            onClick={() => setRenaming(true)}
            title="Rename"
            className="hover:text-neutral-300"
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            onClick={handleDuplicate}
            title="Duplicate"
            className="hover:text-neutral-300"
          >
            <Copy size={16} />
          </button>
          <button
            type="button"
            onClick={handleExport}
            title="Export as Markdown"
            className="hover:text-neutral-300"
          >
            <Download size={16} />
          </button>
          <button
            type="button"
            onClick={() => setActivePanel(activePanel === 'resources' ? null : 'resources')}
            title="Resources"
            className={activePanel === 'resources' ? 'text-neutral-200' : 'hover:text-neutral-300'}
          >
            <Paperclip size={16} />
          </button>
          <button
            type="button"
            onClick={() => setActivePanel(activePanel === 'drawings' ? null : 'drawings')}
            title="Drawings"
            className={activePanel === 'drawings' ? 'text-neutral-200' : 'hover:text-neutral-300'}
          >
            <Image size={16} />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            title="Delete"
            className="hover:text-red-400"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {activePanel === 'resources' && <ResourcesPanel workspaceId={workspaceId} noteId={meta.id} />}
      {activePanel === 'drawings' && (
        <NoteDrawingsPanel
          workspaceId={workspaceId}
          noteId={meta.id}
          onInsertEmbed={handleInsertDrawingEmbed}
        />
      )}

      <div className="min-h-0 flex-1">
        <EditorView
          value={content}
          onChange={onChange}
          workspaceId={workspaceId}
          noteId={meta.id}
        />
      </div>
    </div>
  )
}

export default NoteEditor
