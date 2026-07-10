import { useEffect, useState } from 'react'
import MarkdownEditor from './MarkdownEditor'
import MarkdownPreview from './MarkdownPreview'
import type { EditorSelection } from './MarkdownEditor'
import { useSettings } from '../settings/SettingsContext'

type EditorMode = 'edit' | 'preview' | 'split'

interface EditorViewProps {
  value: string
  onChange: (value: string) => void
  workspaceId: string
  noteId: string
  onSelectionChange?: (selection: EditorSelection) => void
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
  onSelectionChange
}: EditorViewProps): React.JSX.Element {
  const { settings } = useSettings()
  const [mode, setMode] = useState<EditorMode>('edit')

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'e') {
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
      <div className="flex shrink-0 items-center gap-1 border-b border-neutral-800 px-3 py-2">
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

      <div className="flex min-h-0 flex-1">
        {mode === 'edit' ? (
          <div className="h-full w-full">
            <MarkdownEditor
              value={value}
              onChange={onChange}
              onSelectionChange={onSelectionChange}
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
