import { useEffect, useRef, useState } from 'react'
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror'
import { PanelTop } from 'lucide-react'
import MarkdownEditor from './MarkdownEditor'
import MarkdownPreview from './MarkdownPreview'
import EditorToolbar from './EditorToolbar'
import type { EditorSelection } from './MarkdownEditor'
import { useSettings } from '../settings/SettingsContext'

type EditorMode = 'edit' | 'preview'

interface EditorViewProps {
  value: string
  onChange: (value: string) => void
  workspaceId: string
  noteId: string
  onSelectionChange?: (selection: EditorSelection) => void
  notes?: { id: string; title: string }[]
  onPaste?: (event: ClipboardEvent) => void
}

const modes: { id: EditorMode; label: string }[] = [
  { id: 'edit', label: 'Edit' },
  { id: 'preview', label: 'Preview' }
]

function EditorView({
  value,
  onChange,
  workspaceId,
  noteId,
  onSelectionChange,
  notes = [],
  onPaste
}: EditorViewProps): React.JSX.Element {
  const { settings } = useSettings()
  const [mode, setMode] = useState<EditorMode>('edit')
  const [toolbarVisible, setToolbarVisible] = useState(true)
  const editorRef = useRef<ReactCodeMirrorRef>(null)

  useEffect(() => {
    function handleToggle(): void {
      setToolbarVisible((visible) => !visible)
    }
    window.addEventListener('editor:toggle-bars', handleToggle)
    return () => window.removeEventListener('editor:toggle-bars', handleToggle)
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      const mod = event.ctrlKey || event.metaKey
      if (!mod) return
      const key = event.key.toLowerCase()
      if (event.shiftKey && key === 't') {
        event.preventDefault()
        window.dispatchEvent(new CustomEvent('editor:toggle-bars'))
      } else if (event.shiftKey && key === 'e') {
        event.preventDefault()
        setMode('edit')
        // Wait a tick so the editor is mounted (it isn't yet if we were in
        // Preview mode a moment ago) before trying to focus it.
        setTimeout(() => editorRef.current?.view?.focus(), 0)
      } else if (key === 'e') {
        event.preventDefault()
        setMode((m) => (m === 'edit' ? 'preview' : 'edit'))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (settings?.default_editor_mode) {
      Promise.resolve().then(() => {
        // Map default editor mode ('split' defaults to 'edit')
        setMode(settings.default_editor_mode === 'split' ? 'edit' : settings.default_editor_mode)
      })
    }
  }, [settings?.default_editor_mode])

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between gap-1 border-b border-neutral-800 px-3 py-2">
        <div className="flex items-center gap-1">
          {modes.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                mode === m.id
                  ? 'bg-neutral-800 text-neutral-100'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        {mode === 'edit' && (
          <button
            type="button"
            onClick={() => setToolbarVisible((visible) => !visible)}
            title={toolbarVisible ? 'Hide formatting toolbar' : 'Show formatting toolbar'}
            className={`rounded-md p-1.5 transition-colors ${
              toolbarVisible
                ? 'bg-neutral-800 text-neutral-100'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <PanelTop size={15} />
          </button>
        )}
      </div>

      {mode === 'edit' && toolbarVisible && <EditorToolbar editorRef={editorRef} />}

      <div className="flex min-h-0 flex-1">
        {mode === 'edit' ? (
          <div className="h-full w-full">
            <MarkdownEditor
              value={value}
              onChange={onChange}
              onSelectionChange={onSelectionChange}
              editorRef={editorRef}
              notes={notes}
              workspaceId={workspaceId}
              noteId={noteId}
              onPaste={onPaste}
            />
          </div>
        ) : (
          <div className="h-full w-full">
            <MarkdownPreview content={value} workspaceId={workspaceId} noteId={noteId} />
          </div>
        )}
      </div>
    </div>
  )
}

export default EditorView
