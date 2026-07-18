import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Copy,
  Download,
  ImagePlus,
  Paperclip,
  Pencil,
  Pin,
  PinOff,
  Sparkles,
  Star,
  Tag,
  Trash2,
  MessageSquare,
  Eye,
  EyeOff,
  X,
  Check,
  FileCode,
  FileText
} from 'lucide-react'
import EditorView from '../editor/EditorView'
import type { EditorSelection } from '../editor/MarkdownEditor'
import { useNoteEditor } from './useNoteEditor'
import type { SaveStatus } from './useNoteEditor'
import { deleteNote, duplicateNote, renameNote, setNoteFlags, setNoteComments, listNotes } from './api'
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

const createFuzzyRegexInner = (text: string) => {
  const chars = text.trim().split('')
  let regexInnerStr = '([*_~\\[\\(\\"\']*)'
  
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i]
    if (/\s/.test(c)) {
      regexInnerStr += '(?:\\s|[*_~`\\[\\]()<>"\\\'!.,?;:])+'
    } else {
      regexInnerStr += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      if (i < chars.length - 1 && !/\s/.test(chars[i+1])) {
         regexInnerStr += '(?:[*_~`\\[\\]()<>"\\\'!.,?;:]*)'
      }
    }
  }
  
  regexInnerStr += '([*_~\\]\\)\\"\\\'!.,?;:]*)'
  return regexInnerStr
}

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
  
  const [commentDraft, setCommentDraft] = useState<{ text: string, selectionText: string, position: AiContextMenuPosition } | null>(null)
  const [showComments, setShowComments] = useState(true)
  const [viewingCommentId, setViewingCommentId] = useState<{ id: string, position: AiContextMenuPosition } | null>(null)
  const commentDraftRef = useRef<HTMLDivElement>(null)
  const viewingCommentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (commentDraftRef.current && !commentDraftRef.current.contains(event.target as Node)) {
        setCommentDraft(null)
      }
      if (viewingCommentRef.current && !viewingCommentRef.current.contains(event.target as Node)) {
        setViewingCommentId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
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
      if (action === 'comment-add') {
        if (selectedText && selectedText.trim() !== '') {
          setCommentDraft({
            text: '',
            selectionText: selectedText,
            position: contextMenu || { x: window.innerWidth / 2, y: window.innerHeight / 2 }
          })
          setContextMenu(null)
        }
        return
      }

      if (action.startsWith('highlight')) {
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
            const regex = new RegExp(regexInnerStr, 'g')
            
            let replaced = false
            const newContent = content.replace(regex, (...args) => {
              const match = args[0]
              const wholeStr = args[args.length - 1]
              const offset = args[args.length - 2]
              
              if (replaced) return match
              
              const before = wholeStr.slice(Math.max(0, offset - 30), offset)
              const after = wholeStr.slice(offset + match.length, offset + match.length + 10)
              
              if (before.match(/<mark[^>]*>\s*$/) && after.match(/^\s*<\/mark>/)) {
                return match
              }
              
              replaced = true
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

  const handleSaveComment = async () => {
    if (!commentDraft || !meta) return
    const commentId = crypto.randomUUID()
    const newComment = {
      id: commentId,
      text: commentDraft.text,
      created_at: new Date().toISOString(),
      resolved: false
    }
    
    // Update metadata via API
    const updatedComments = [...(meta.comments || []), newComment]
    try {
      const updatedNote = await setNoteComments(workspaceId, noteId, updatedComments)
      setMeta(updatedNote)
      
      // Update markdown content with highlight
      const regexInnerStr = createFuzzyRegexInner(commentDraft.selectionText)
      const regex = new RegExp(regexInnerStr, 'g')
      
      let replaced = false
      const newContent = content.replace(regex, (...args) => {
        const match = args[0]
        const wholeStr = args[args.length - 1]
        const offset = args[args.length - 2]
        if (replaced) return match
        const before = wholeStr.slice(Math.max(0, offset - 30), offset)
        const after = wholeStr.slice(offset + match.length, offset + match.length + 10)
        if (before.match(/<mark[^>]*>\s*$/) && after.match(/^\s*<\/mark>/)) {
          return match
        }
        replaced = true
        return `<mark class="tick-comment" data-comment-id="${commentId}">${match}</mark>`
      })
      
      if (newContent !== content) {
        onChange(newContent)
      }
      setCommentDraft(null)
    } catch (err) {
      console.error('Failed to save comment:', err)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!meta) return
    const updatedComments = (meta.comments || []).filter(c => c.id !== commentId)
    try {
      const updatedNote = await setNoteComments(workspaceId, noteId, updatedComments)
      setMeta(updatedNote)
      setViewingCommentId(null)
    } catch (err) {
      console.error('Failed to delete comment:', err)
    }
  }

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


  const handleCommentClick = useCallback((commentId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    const rect = (event.target as HTMLElement).getBoundingClientRect()
    setViewingCommentId({
      id: commentId,
      position: { x: rect.left, y: rect.bottom + 5 }
    })
  }, [])

  const handleContentChange = useCallback((newVal: string) => {
    // Strip empty mark tags
    const cleaned = newVal.replace(/<mark[^>]*>[\s\n\u200B\u00A0]*(?:<br\s*\/?>)?[\s\n\u200B\u00A0]*<\/mark>/gi, '')
    onChange(cleaned)
  }, [onChange])

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
            onClick={() => {
              setTitleDraft(meta.title)
              setRenaming(true)
            }}
            className="flex-1 truncate rounded-md px-2 py-1 text-left text-sm font-medium text-neutral-200 hover:bg-neutral-800 focus:outline-none"
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
            onClick={() => setShowComments(!showComments)}
            title={showComments ? "Hide Comments" : "Show Comments"}
            className={`${TOOLBAR_BTN} ${showComments ? 'text-blue-400 bg-blue-500/10' : TOOLBAR_BTN_IDLE}`}
          >
            {showComments ? <Eye size={16} /> : <EyeOff size={16} />}
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
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute right-0 top-full z-50 mt-1 w-48 rounded-md border border-neutral-700 bg-neutral-800 py-1 shadow-lg"
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
            onClick={() => setActivePanel(activePanel === 'organize' ? null : 'organize')}
            title="Organize / Tags"
            className={`${TOOLBAR_BTN} ${activePanel === 'organize' ? TOOLBAR_BTN_ACTIVE : TOOLBAR_BTN_IDLE}`}
          >
            <Tag size={16} />
          </button>
          <button
            type="button"
            onClick={() => setActivePanel(activePanel === 'drawings' ? null : 'drawings')}
            title="Drawings"
            className={`${TOOLBAR_BTN} ${activePanel === 'drawings' ? TOOLBAR_BTN_ACTIVE : TOOLBAR_BTN_IDLE}`}
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            onClick={() => setActivePanel(activePanel === 'resources' ? null : 'resources')}
            title="Resources & Media"
            className={`${TOOLBAR_BTN} ${activePanel === 'resources' ? TOOLBAR_BTN_ACTIVE : TOOLBAR_BTN_IDLE}`}
          >
            <Paperclip size={16} />
          </button>
          <div className="mx-1 h-4 w-px bg-neutral-800" />
          <button
            type="button"
            onClick={() => setActivePanel(activePanel === 'ai' ? null : 'ai')}
            title="AI Tools"
            className={`${TOOLBAR_BTN} ${activePanel === 'ai' ? 'bg-violet-500/20 text-violet-300' : 'text-violet-400/70 hover:bg-violet-500/10 hover:text-violet-300'}`}
          >
            <Sparkles size={16} />
          </button>
          <button
            type="button"
            onClick={onDeleted}
            title="Delete"
            className="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
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
          onChange={handleContentChange}
          workspaceId={workspaceId}
          noteId={meta.id}
          onSelectionChange={setSelection}
          notes={notesList}
          onPaste={handlePaste}
          showComments={showComments}
          onCommentClick={handleCommentClick}
          initialSelection={selection}
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
        selectedText={selection?.text || window.getSelection()?.toString() || ''}
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

      <AnimatePresence>
        {commentDraft && (
          <motion.div
            ref={commentDraftRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{ 
              position: 'fixed', 
              left: commentDraft.position.x, 
              top: commentDraft.position.y,
              zIndex: 100 
            }}
            className="w-64 rounded-xl border border-neutral-800 bg-neutral-900 p-3 shadow-2xl backdrop-blur-md"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1"><MessageSquare size={12} /> New Comment</span>
              <button onClick={() => setCommentDraft(null)} className="text-neutral-500 hover:text-neutral-300">
                <X size={14} />
              </button>
            </div>
            <textarea
              autoFocus
              value={commentDraft.text}
              onChange={(e) => setCommentDraft({ ...commentDraft, text: e.target.value })}
              className="w-full resize-none rounded-md border border-neutral-800 bg-neutral-950 p-2 text-sm text-neutral-200 outline-none focus:border-blue-500/50"
              rows={3}
              placeholder="Write a comment..."
            />
            <div className="mt-2 flex justify-end">
              <button
                onClick={handleSaveComment}
                disabled={!commentDraft.text.trim()}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </motion.div>
        )}

        {viewingCommentId && meta?.comments && (
          <motion.div
            ref={viewingCommentRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{ 
              position: 'fixed', 
              left: viewingCommentId.position.x, 
              top: viewingCommentId.position.y,
              zIndex: 100 
            }}
            className="w-64 rounded-xl border border-neutral-800 bg-neutral-900 p-3 shadow-2xl backdrop-blur-md"
          >
            {(() => {
              const comment = meta.comments.find(c => c.id === viewingCommentId.id)
              if (!comment) return (
                <div className="flex justify-between items-center text-sm text-neutral-500">
                  Comment not found.
                  <button onClick={() => setViewingCommentId(null)}><X size={14}/></button>
                </div>
              )
              return (
                <>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-400">Comment</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleDeleteComment(comment.id)} className="text-neutral-500 hover:text-red-400 p-1" title="Delete comment">
                        <Trash2 size={12} />
                      </button>
                      <button onClick={() => setViewingCommentId(null)} className="text-neutral-500 hover:text-neutral-300 p-1">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-neutral-200 whitespace-pre-wrap break-words max-h-48 overflow-y-auto pr-1">
                    {comment.text}
                  </p>
                </>
              )
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default NoteEditor
