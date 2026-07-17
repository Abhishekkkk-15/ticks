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
  Trash2,
  X,
  Check,
  FileCode,
  FileText
} from 'lucide-react'
import EditorView from '../editor/EditorView'
import type { EditorSelection } from '../editor/MarkdownEditor'
import { useNoteEditor } from './useNoteEditor'
import type { SaveStatus } from './useNoteEditor'
import { deleteNote, duplicateNote, renameNote, setNoteFlags, listNotes } from './api'
import { exportNoteContent } from './exportUtils'
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
import { runWorkflows, WORKFLOW_ACTIONS, runDirectAiAction } from '../workflows/runWorkflows'
import type { WorkflowReviewPayload } from '../workflows/runWorkflows'
import { formatActions } from '../editor/formatting'
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror'

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
  const [pendingReview, setPendingReview] = useState<WorkflowReviewPayload | null>(null)
  const [loadedNoteId, setLoadedNoteId] = useState<string | null>(null)
  const [activePanel, setActivePanel] = useState<
    'resources' | 'drawings' | 'organize' | 'ai' | null
  >(null)
  const [selection, setSelection] = useState<EditorSelection | null>(null)
  const [contextMenu, setContextMenu] = useState<AiContextMenuPosition | null>(null)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)
  const [autoTriggerAction, setAutoTriggerAction] = useState<string | null>(null)
  const editorAreaRef = useRef<HTMLDivElement>(null)
  const mediaInputRef = useRef<HTMLInputElement>(null)
  const [mediaUploading, setMediaUploading] = useState(false)
  const [barsVisible, setBarsVisible] = useState(true)
  const [notesList, setNotesList] = useState<{ id: string; title: string }[]>([])
  const codeMirrorRef = useRef<ReactCodeMirrorRef>(null)

  useEffect(() => {
    function handleToggle(): void {
      setBarsVisible((visible) => !visible)
    }
    window.addEventListener('editor:toggle-bars', handleToggle)
    return () => window.removeEventListener('editor:toggle-bars', handleToggle)
  }, [])

  useEffect(() => {
    listNotes(workspaceId)
      .then((data) => {
        setNotesList(data.map((n) => ({ id: n.id, title: n.title })))
      })
      .catch(() => {})
  }, [workspaceId])

  // Reset local draft state when a different note finishes loading, without
  // the extra render + flicker an effect-based sync would cause.
  if (note && note.id !== loadedNoteId) {
    setLoadedNoteId(note.id)
    setMeta(note)
    setTitleDraft(note.title)
    setRenaming(false)
    setPendingReview(null)
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

  useEffect(() => {
    function handleReviewPending(event: Event): void {
      const customEvent = event as CustomEvent<WorkflowReviewPayload>
      if (customEvent.detail.noteId === meta?.id) {
        setPendingReview(customEvent.detail)
      }
    }
    window.addEventListener('workflow:review-pending', handleReviewPending)
    return () => {
      window.removeEventListener('workflow:review-pending', handleReviewPending)
    }
  }, [meta?.id])

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
      const aiShortcut = settings?.keyboard_shortcuts?.trigger_ai || 'Ctrl+Shift+A'
      if (matchShortcut(event, aiShortcut)) {
        event.preventDefault()
        setActivePanel((prev) => (prev === 'ai' ? null : 'ai'))
        return
      }
      for (const action of WORKFLOW_ACTIONS) {
        const customShortcut = settings?.keyboard_shortcuts?.[`ai_${action.id}`]
        if (customShortcut && matchShortcut(event, customShortcut)) {
          event.preventDefault()
          if (meta) {
            const targetText = selection?.text || content
            const isSelection = !!selection?.text
            runDirectAiAction(action.id, action.label, targetText, {
              workspaceId,
              noteId: meta.id,
              selectionRange: isSelection ? { from: selection.from, to: selection.to } : null
            }).catch(() => {})
          }
          return
        }
      }
      for (const workflow of workflows) {
        if (
          workflow.trigger === 'shortcut' &&
          workflow.shortcut &&
          matchShortcut(event, workflow.shortcut)
        ) {
          event.preventDefault()
          if (meta) {
            runWorkflows('shortcut', [workflow], {
              workspaceId,
              noteId: meta.id,
              content,
              selectedText: selection?.text ?? ''
            }).catch(() => {})
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

  const handleExport = async () => {
    if (!meta) return
    await window.api.exportNote(`${meta.title}.md`, content)
  }

  const handleExportHtml = async () => {
    if (!meta) return
    await exportNoteContent(meta, content, 'html', workspaceId, noteId)
  }

  const handleExportPdf = async () => {
    if (!meta) return
    await exportNoteContent(meta, content, 'pdf', workspaceId, noteId)
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

  async function handlePasteImage(event: ClipboardEvent | React.ClipboardEvent): Promise<void> {
    if (!meta) return
    const clipboardData = 'clipboardData' in event ? event.clipboardData : (event as any).clipboardData
    if (!clipboardData) return
    const file = getClipboardImageFile(clipboardData)
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



  async function handlePaste(event: ClipboardEvent | React.ClipboardEvent): Promise<void> {
    await handlePasteImage(event)
    if (!meta || !workflows.some((w) => w.trigger === 'on_paste')) return
    const clipboardData = 'clipboardData' in event ? event.clipboardData : (event as any).clipboardData
    if (!clipboardData) return
    const pasted = clipboardData.getData('text/plain')
    runWorkflows('on_paste', workflows, {
      workspaceId,
      noteId: meta.id,
      content,
      clipboardText: pasted
    }).catch(() => {})
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

  const handleContextMenuAction = useCallback(
    (action: string, selectedText: string) => {
      if (action.startsWith('highlight')) {
        const createFuzzyRegexInner = (text: string) => {
          const escapedWords = text.trim().split(/\s+/).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
          let regexInnerStr = '([*_~\\[\\(\\"\']*)'
          regexInnerStr += escapedWords.join('(?:\\s|[*_~`\\[\\]()<>"\'!.,?;:])+')
          regexInnerStr += '([*_~\\]\\)\\"\'!.,?;:]*)'
          return regexInnerStr
        }

        if (action === 'highlight-remove') {
          if (selectedText && selectedText.trim() !== '') {
            const regexInnerStr = createFuzzyRegexInner(selectedText)
            const regex = new RegExp(`<mark[^>]*>\\s*(${regexInnerStr})\\s*<\\/mark>`, 'g')
            const newContent = content.replace(regex, '$1')
            if (newContent !== content) {
              onChange(newContent)
            }
          }
          return
        }

        const highlightAction = formatActions.find((a) => a.id === action)
        if (highlightAction) {
          const view = codeMirrorRef.current?.view
          if (view && view.state.selection.main.from !== view.state.selection.main.to) {
            highlightAction.run(view)
          } else if (selectedText && selectedText.trim() !== '') {
            const openTag = action === 'highlight-sketch' 
              ? '<mark class="sketch-highlight">' 
              : action === 'highlight-error' 
                ? '<mark class="error-highlight">' 
                : '<mark>'
            const closeTag = '</mark>'
            
            const regexInnerStr = createFuzzyRegexInner(selectedText)
            const regex = new RegExp(regexInnerStr)
            const newContent = content.replace(regex, (match) => {
              return `${openTag}${match}${closeTag}`
            })
            
            if (newContent !== content) {
              onChange(newContent)
            }
          }
        }
        return
      }
      setActivePanel('ai')
      setAutoTriggerAction(action)
    },
    [content, onChange]
  )

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  // Close export menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setExportMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleApplyReview(mode: 'append' | 'replace'): void {
    if (!pendingReview || !meta) return
    const { result, chainLabel, workflowName, selectionRange } = pendingReview
    let updated: string
    if (mode === 'replace') {
      if (selectionRange) {
        const { from, to } = selectionRange
        updated = content.slice(0, from) + result + content.slice(to)
      } else {
        updated = result.endsWith('\n') ? result : result + '\n'
      }
    } else {
      const separator = content.endsWith('\n') || content === '' ? '' : '\n\n'
      updated = `${content}${separator}**${chainLabel} (${workflowName}):**\n${result}\n`
    }
    onChange(updated)
    // Force immediate save using useNoteEditor's save helper
    setTimeout(() => {
      save()
    }, 50)
    setPendingReview(null)
  }

  function handleDiscardReview(): void {
    setPendingReview(null)
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

  const charCount = content.length
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0
  const readTime = Math.max(1, Math.ceil(wordCount / 200))

  return (
    <div className="relative flex h-full flex-col">
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
          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              title="Export Options"
              className={`${TOOLBAR_BTN} ${exportMenuOpen ? TOOLBAR_BTN_ACTIVE : TOOLBAR_BTN_IDLE}`}
            >
              <Download size={16} />
            </button>
            <AnimatePresence>
              {exportMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.95 }}
                  transition={{ duration: 0.1 }}
                  className="absolute right-0 top-full mt-1 w-48 rounded-md border border-neutral-800 bg-neutral-900 p-1 shadow-lg z-50"
                >
                  <button
                    onClick={() => {
                      handleExport()
                      setExportMenuOpen(false)
                    }}
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100"
                  >
                    <Download size={14} />
                    Export as Markdown
                  </button>
                  <button
                    onClick={() => {
                      handleExportHtml()
                      setExportMenuOpen(false)
                    }}
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100"
                  >
                    <FileCode size={14} />
                    Export as HTML
                  </button>
                  <button
                    onClick={() => {
                      handleExportPdf()
                      setExportMenuOpen(false)
                    }}
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100"
                  >
                    <FileText size={14} />
                    Export as PDF
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
        onPaste={handlePaste}
      >
        <EditorView
          editorRef={codeMirrorRef}
          value={content}
          onChange={onChange}
          workspaceId={workspaceId}
          noteId={meta.id}
          onSelectionChange={setSelection}
          notes={notesList}
          onPaste={handlePaste}
        />
      </div>

      {/* Bottom Status Bar */}
      {barsVisible && (
        <div className="flex shrink-0 items-center justify-between border-t border-neutral-800 bg-neutral-900/10 px-3 py-1 text-[10px] text-neutral-500 font-medium">
          <div className="flex items-center gap-3">
            <span>{wordCount} words</span>
            <span>{charCount} characters</span>
            <span>{readTime} min read</span>
          </div>
          <div className="flex items-center gap-2">
            <span>{saveStatusLabels[saveStatus] || 'Draft saved'}</span>
          </div>
        </div>
      )}


      <AiContextMenu
        position={contextMenu}
        selectedText={selection?.text ?? window.getSelection()?.toString() ?? ''}
        hideAi={!codeMirrorRef.current?.view}
        onAction={handleContextMenuAction}
        onClose={handleCloseContextMenu}
      />

      <AnimatePresence>
        {pendingReview && (
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute bottom-0 left-0 right-0 z-45 bg-neutral-905 border-t border-neutral-800 shadow-2xl p-4 flex flex-col gap-3 rounded-t-xl backdrop-blur-md"
            style={{ backgroundColor: 'rgba(23, 23, 23, 0.98)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-[10px] font-semibold uppercase tracking-wider text-amber-500">
                  Workflow Review
                </h4>
                <p className="text-xs font-medium text-neutral-200">
                  {pendingReview.workflowName} ({pendingReview.chainLabel})
                </p>
              </div>
              <button
                onClick={handleDiscardReview}
                className="rounded-full p-1 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 transition-colors"
                title="Discard"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex flex-col gap-1.5 min-h-[100px] max-h-[200px]">
              <label className="text-[9px] font-medium text-neutral-500 uppercase tracking-wider">
                Proposed Output
              </label>
              <div className="flex-1 overflow-y-auto rounded-md border border-neutral-850 bg-neutral-950 p-2.5 text-xs text-neutral-300 font-mono whitespace-pre-wrap select-text selection:bg-neutral-800">
                {pendingReview.result}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-0.5">
              <button
                type="button"
                onClick={handleDiscardReview}
                className="rounded-md border border-neutral-800 bg-transparent px-2.5 py-1.5 text-xs font-medium text-neutral-400 hover:text-neutral-200 transition-colors"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={() => handleApplyReview('append')}
                className="flex items-center gap-1 rounded-md border border-neutral-850 bg-neutral-900 px-2.5 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-800 transition-colors"
              >
                <Check size={12} />
                Append
              </button>
              <button
                type="button"
                onClick={() => handleApplyReview('replace')}
                className="flex items-center gap-1 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-neutral-950 hover:bg-amber-500 transition-colors"
              >
                Replace Note
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default NoteEditor
