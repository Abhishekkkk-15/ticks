import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Copy,
  Download,
  Image,
  ImagePlus,
  Paperclip,
  Pencil,
  Pin,
  PinOff,
  Sparkles,
  Star,
  Tag,
  Trash2
} from 'lucide-react'
import EditorView from '../editor/EditorView'
import type { EditorSelection } from '../editor/MarkdownEditor'
import { useNoteEditor } from './useNoteEditor'
import type { SaveStatus } from './useNoteEditor'
import { deleteNote, duplicateNote, renameNote, setNoteFlags } from './api'
import ResourcesPanel from '../resources/ResourcesPanel'
import NoteDrawingsPanel from '../drawings/NoteDrawingsPanel'
import NoteOrganizePanel from './NoteOrganizePanel'
import AiPanel from '../ai/AiPanel'
import AiContextMenu from '../ai/AiContextMenu'
import type { AiContextMenuPosition } from '../ai/AiContextMenu'
import { motion, AnimatePresence } from 'framer-motion'
import type { Drawing } from '../drawings/types'
import type { Note } from './types'
import { uploadFileResource } from '../resources/api'
import { getClipboardImageFile, uploadPastedImage } from './pasteImage'
import { matchShortcut } from '../../lib/shortcuts'
import { useSettings } from '../settings/SettingsContext'
import { runWorkflows } from '../workflows/runWorkflows'

interface NoteEditorProps {
  workspaceId: string
  noteId: string
  onDeleted: () => void
  onDuplicated: (note: Note) => void
  onRenamed?: (note: Note) => void
  onSaveStatusChange?: (status: SaveStatus) => void
}

const saveStatusLabels: Record<string, string> = {
  idle: '',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Failed to save',
  unsaved: 'Unsaved'
}

const TOOLBAR_BTN = 'rounded-md p-1.5 transition-colors'
const TOOLBAR_BTN_IDLE = 'text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300'
const TOOLBAR_BTN_ACTIVE = 'bg-neutral-800 text-neutral-100'

function NoteEditor({
  workspaceId,
  noteId,
  onDeleted,
  onDuplicated,
  onRenamed,
  onSaveStatusChange
}: NoteEditorProps): React.JSX.Element {
  const { note, content, onChange, loading, error, saveStatus, save } = useNoteEditor(
    workspaceId,
    noteId
  )
  const { settings } = useSettings()
  const workflows = settings?.workflows ?? []

  useEffect(() => {
    onSaveStatusChange?.(saveStatus)
  }, [saveStatus, onSaveStatusChange])
  const [meta, setMeta] = useState<Note | null>(null)
  const [renaming, setRenaming] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [loadedNoteId, setLoadedNoteId] = useState<string | null>(null)
  const [activePanel, setActivePanel] = useState<
    'resources' | 'drawings' | 'organize' | 'ai' | null
  >(null)
  const [selection, setSelection] = useState<EditorSelection | null>(null)
  const [contextMenu, setContextMenu] = useState<AiContextMenuPosition | null>(null)
  const [autoTriggerAction, setAutoTriggerAction] = useState<string | null>(null)
  const editorAreaRef = useRef<HTMLDivElement>(null)
  const mediaInputRef = useRef<HTMLInputElement>(null)
  const [mediaUploading, setMediaUploading] = useState(false)

  // Reset local draft state when a different note finishes loading, without
  // the extra render + flicker an effect-based sync would cause.
  if (note && note.id !== loadedNoteId) {
    setLoadedNoteId(note.id)
    setMeta(note)
    setTitleDraft(note.title)
    setRenaming(false)
  }

  useEffect(() => {
    function handleOpenAi(event: Event): void {
      const customEvent = event as CustomEvent<{ text: string }>
      setActivePanel('ai')
      setSelection({
        text: customEvent.detail.text,
        from: content.length,
        to: content.length
      })
    }
    window.addEventListener('editor:open-ai', handleOpenAi)
    return () => {
      window.removeEventListener('editor:open-ai', handleOpenAi)
    }
  }, [content])

  // Ctrl+Shift+Backspace (not a plain Ctrl+Backspace) for delete is a
  // deliberately awkward two-hand combo — an extra guard against a stray
  // keystroke, not a hard blocker, since the delete itself is soft/recoverable.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (matchShortcut(event, 'Ctrl+D')) {
        event.preventDefault()
        handleDuplicate()
        return
      }
      if (matchShortcut(event, 'Ctrl+Shift+Backspace')) {
        event.preventDefault()
        handleDelete()
        return
      }
      if (matchShortcut(event, 'Ctrl+S')) {
        event.preventDefault()
        save()
        return
      }
      for (const workflow of workflows) {
        if (
          workflow.trigger === 'shortcut' &&
          workflow.shortcut &&
          matchShortcut(event, workflow.shortcut)
        ) {
          event.preventDefault()
          if (meta) {
            runWorkflows('shortcut', [workflow], { workspaceId, noteId: meta.id, content }).catch(
              () => {}
            )
          }
          return
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  async function commitRename(): Promise<void> {
    setRenaming(false)
    const title = titleDraft.trim()
    if (!meta || !title || title === meta.title) return
    const updated = await renameNote(workspaceId, meta.id, title)
    setMeta(updated)
    onRenamed?.(updated)
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
    // Soft delete — moves to Trash, recoverable from there.
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

  async function handleMediaUpload(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0]
    if (!file || !meta) return
    // Reset so the same file can be picked again
    e.target.value = ''
    setMediaUploading(true)
    try {
      const buffer = await file.arrayBuffer()
      const data = new Uint8Array(buffer)
      const isVideo = file.type.startsWith('video/')
      const resource = await uploadFileResource(
        workspaceId,
        meta.id,
        'file',
        file.name,
        file.name,
        data
      )
      // Build the API URL for the resource file
      const baseUrl = await window.api.getApiBaseUrl()
      const url = `${baseUrl}/workspaces/${workspaceId}/notes/${meta.id}/resources/${resource.id}/file`
      const separator = content.endsWith('\n') || content === '' ? '' : '\n\n'
      const embed = isVideo
        ? `<video controls src="${url}" style="max-width:100%"></video>`
        : `![${file.name}](${url})`
      onChange(`${content}${separator}${embed}\n`)
    } catch (err) {
      console.error('Media upload failed:', err)
    } finally {
      setMediaUploading(false)
    }
  }

  async function handlePasteImage(event: React.ClipboardEvent): Promise<void> {
    if (!meta) return
    const file = getClipboardImageFile(event.clipboardData)
    if (!file) return // no image on the clipboard — let normal text paste proceed
    event.preventDefault()
    try {
      const embed = await uploadPastedImage(workspaceId, meta.id, file)
      const insertAt = selection?.from ?? content.length
      onChange(content.slice(0, insertAt) + embed + content.slice(insertAt))
    } catch (err) {
      console.error('Image paste failed:', err)
    }
  }

  function handleReplaceSelection(result: string): void {
    if (!selection) return
    onChange(content.slice(0, selection.from) + result + content.slice(selection.to))
    setSelection(null)
  }

  function handleInsertResult(result: string): void {
    const separator = content.endsWith('\n') || content === '' ? '' : '\n\n'
    onChange(`${content}${separator}${result}\n`)
  }

  function handleCopy(): void {
    if (!meta || !workflows.some((w) => w.trigger === 'on_copy')) return
    runWorkflows('on_copy', workflows, { workspaceId, noteId: meta.id, content }).catch(() => {})
  }

  async function handlePaste(event: React.ClipboardEvent): Promise<void> {
    await handlePasteImage(event)
    if (!meta || !workflows.some((w) => w.trigger === 'on_paste')) return
    runWorkflows('on_paste', workflows, { workspaceId, noteId: meta.id, content }).catch(() => {})
  }

  function handleContextMenu(e: React.MouseEvent): void {
    const sel = window.getSelection()?.toString()
    if (!sel || !sel.trim()) return // only show when text is selected
    e.preventDefault()
    // Clamp so the menu doesn't overflow the viewport
    const menuW = 210
    const menuH = 200
    const x = Math.min(e.clientX, window.innerWidth - menuW - 8)
    const y = Math.min(e.clientY, window.innerHeight - menuH - 8)
    setContextMenu({ x, y })
  }

  const handleContextMenuAction = useCallback((action: string) => {
    setActivePanel('ai')
    setAutoTriggerAction(action)
  }, [])

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

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

        <div className="flex shrink-0 items-center gap-1">
          <span className="mr-1 text-xs text-neutral-500">{saveStatusLabels[saveStatus]}</span>
          <button
            type="button"
            onClick={toggleFavorite}
            title="Favorite"
            className={`${TOOLBAR_BTN} ${meta.favorite ? 'bg-amber-500/10 text-amber-400' : TOOLBAR_BTN_IDLE}`}
          >
            <Star size={16} fill={meta.favorite ? 'currentColor' : 'none'} />
          </button>
          <button
            type="button"
            onClick={togglePin}
            title="Pin"
            className={`${TOOLBAR_BTN} ${meta.pinned ? 'bg-sky-500/10 text-sky-400' : TOOLBAR_BTN_IDLE}`}
          >
            {meta.pinned ? <PinOff size={16} /> : <Pin size={16} />}
          </button>
          <button
            type="button"
            onClick={() => setRenaming(true)}
            title="Rename"
            className={`${TOOLBAR_BTN} ${TOOLBAR_BTN_IDLE}`}
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            onClick={handleDuplicate}
            title="Duplicate"
            className={`${TOOLBAR_BTN} ${TOOLBAR_BTN_IDLE}`}
          >
            <Copy size={16} />
          </button>
          <button
            type="button"
            onClick={handleExport}
            title="Export as Markdown"
            className={`${TOOLBAR_BTN} ${TOOLBAR_BTN_IDLE}`}
          >
            <Download size={16} />
          </button>
          {/* Upload Image / Video */}
          <button
            type="button"
            onClick={() => mediaInputRef.current?.click()}
            title={mediaUploading ? 'Uploading…' : 'Insert Image / Video'}
            disabled={mediaUploading}
            className={`${TOOLBAR_BTN} ${mediaUploading ? 'animate-pulse text-violet-400' : TOOLBAR_BTN_IDLE}`}
          >
            <ImagePlus size={16} />
          </button>
          <input
            ref={mediaInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleMediaUpload}
          />
          <button
            type="button"
            onClick={() => setActivePanel(activePanel === 'ai' ? null : 'ai')}
            title="AI"
            className={`${TOOLBAR_BTN} ${activePanel === 'ai' ? TOOLBAR_BTN_ACTIVE : TOOLBAR_BTN_IDLE}`}
          >
            <Sparkles size={16} />
          </button>
          <button
            type="button"
            onClick={() => setActivePanel(activePanel === 'organize' ? null : 'organize')}
            title="Organize (folder & tags)"
            className={`${TOOLBAR_BTN} ${activePanel === 'organize' ? TOOLBAR_BTN_ACTIVE : TOOLBAR_BTN_IDLE}`}
          >
            <Tag size={16} />
          </button>
          <button
            type="button"
            onClick={() => setActivePanel(activePanel === 'resources' ? null : 'resources')}
            title="Resources"
            className={`${TOOLBAR_BTN} ${activePanel === 'resources' ? TOOLBAR_BTN_ACTIVE : TOOLBAR_BTN_IDLE}`}
          >
            <Paperclip size={16} />
          </button>
          <button
            type="button"
            onClick={() => setActivePanel(activePanel === 'drawings' ? null : 'drawings')}
            title="Drawings"
            className={`${TOOLBAR_BTN} ${activePanel === 'drawings' ? TOOLBAR_BTN_ACTIVE : TOOLBAR_BTN_IDLE}`}
          >
            <Image size={16} />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            title="Delete"
            className={`${TOOLBAR_BTN} text-neutral-500 hover:bg-red-500/10 hover:text-red-400`}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {activePanel === 'ai' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-neutral-800"
          >
            <AiPanel
              selectedText={selection?.text ?? ''}
              fullContent={content}
              onReplaceSelection={handleReplaceSelection}
              onInsert={handleInsertResult}
              autoTriggerAction={autoTriggerAction}
              onClearAutoTrigger={() => setAutoTriggerAction(null)}
              workspaceId={workspaceId}
              noteId={meta.id}
            />
          </motion.div>
        )}
        {activePanel === 'organize' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-neutral-800"
          >
            <NoteOrganizePanel workspaceId={workspaceId} note={meta} onUpdated={setMeta} />
          </motion.div>
        )}
        {activePanel === 'resources' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-neutral-800"
          >
            <ResourcesPanel workspaceId={workspaceId} noteId={meta.id} />
          </motion.div>
        )}
        {activePanel === 'drawings' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-neutral-800"
          >
            <NoteDrawingsPanel
              workspaceId={workspaceId}
              noteId={meta.id}
              onInsertEmbed={handleInsertDrawingEmbed}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div
        ref={editorAreaRef}
        className="min-h-0 flex-1"
        onContextMenu={handleContextMenu}
        onCopy={handleCopy}
        onPaste={handlePaste}
      >
        <EditorView
          value={content}
          onChange={onChange}
          workspaceId={workspaceId}
          noteId={meta.id}
          onSelectionChange={setSelection}
        />
      </div>

      <AiContextMenu
        position={contextMenu}
        selectedText={selection?.text ?? window.getSelection()?.toString() ?? ''}
        onAction={handleContextMenuAction}
        onClose={handleCloseContextMenu}
      />
    </div>
  )
}

export default NoteEditor
