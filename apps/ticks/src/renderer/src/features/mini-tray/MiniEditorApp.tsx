import { useEffect, useRef, useState } from 'react'
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror'
import EditorView from '../editor/EditorView'
import { useNoteEditor } from '../notes/useNoteEditor'
import { getClipboardImageFile, uploadPastedImage } from '../notes/pasteImage'

interface ActiveNote {
  workspaceId: string
  noteId: string
}

const DRAG_REGION = { WebkitAppRegion: 'drag' } as React.CSSProperties
const NO_DRAG_REGION = { WebkitAppRegion: 'no-drag' } as React.CSSProperties

function MiniNoteEditor({ workspaceId, noteId }: ActiveNote): React.JSX.Element {
  const { content, onChange } = useNoteEditor(workspaceId, noteId)
  const editorRef = useRef<ReactCodeMirrorRef>(null)

  useEffect(() => {
    return window.api.onMiniFocusRequested(() => {
      editorRef.current?.view?.focus()
    })
  }, [])

  async function handlePasteImage(event: React.ClipboardEvent): Promise<void> {
    const file = getClipboardImageFile(event.clipboardData)
    if (!file) return
    event.preventDefault()
    try {
      // The mini editor doesn't track cursor position, so pasted images
      // just append to the end — acceptable for this lightweight widget.
      const embed = await uploadPastedImage(workspaceId, noteId, file)
      const separator = content.endsWith('\n') || content === '' ? '' : '\n\n'
      onChange(`${content}${separator}${embed}\n`)
    } catch (err) {
      console.error('Image paste failed:', err)
    }
  }

  return (
    <div className="min-h-0 flex-1 flex flex-col" style={NO_DRAG_REGION} onPaste={handlePasteImage}>
      <EditorView 
        value={content} 
        onChange={onChange} 
        workspaceId={workspaceId} 
        noteId={noteId} 
        editorRef={editorRef} 
      />
    </div>
  )
}

function MiniEditorApp(): React.JSX.Element {
  const [activeNote, setActiveNote] = useState<ActiveNote | null>(null)

  useEffect(() => {
    window.api.getActiveNote().then(setActiveNote)
    return window.api.onActiveNoteChanged(setActiveNote)
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') window.api.hideMiniTray()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="flex h-screen flex-col overflow-hidden rounded-lg bg-neutral-950 text-neutral-100 shadow-2xl">
      <div className="h-2 shrink-0" style={DRAG_REGION} />
      {activeNote ? (
        <MiniNoteEditor key={`${activeNote.workspaceId}:${activeNote.noteId}`} {...activeNote} />
      ) : (
        <div
          className="flex min-h-0 flex-1 items-center justify-center px-6 text-center text-sm text-neutral-500"
          style={NO_DRAG_REGION}
        >
          Open a note in the main window first.
        </div>
      )}
    </div>
  )
}

export default MiniEditorApp
