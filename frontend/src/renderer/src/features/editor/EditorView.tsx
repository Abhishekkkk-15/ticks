import { useState } from 'react'
import MarkdownEditor from './MarkdownEditor'
import MarkdownPreview from './MarkdownPreview'

type EditorMode = 'edit' | 'preview' | 'split'

interface EditorViewProps {
  value: string
  onChange: (value: string) => void
  workspaceId: string
  noteId: string
}

const modes: { id: EditorMode; label: string }[] = [
  { id: 'edit', label: 'Edit' },
  { id: 'split', label: 'Split' },
  { id: 'preview', label: 'Preview' }
]

function EditorView({ value, onChange, workspaceId, noteId }: EditorViewProps): React.JSX.Element {
  const [mode, setMode] = useState<EditorMode>('split')

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
        {mode !== 'preview' && (
          <div
            className={
              mode === 'split' ? 'h-full w-1/2 border-r border-neutral-800' : 'h-full w-full'
            }
          >
            <MarkdownEditor value={value} onChange={onChange} />
          </div>
        )}
        {mode !== 'edit' && (
          <div className={mode === 'split' ? 'h-full w-1/2' : 'h-full w-full'}>
            <MarkdownPreview content={value} workspaceId={workspaceId} noteId={noteId} />
          </div>
        )}
      </div>
    </div>
  )
}

export default EditorView
