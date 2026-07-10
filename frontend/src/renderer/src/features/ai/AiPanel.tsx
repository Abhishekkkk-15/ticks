import { useEffect, useState } from 'react'
import { useAiAction } from './useAiAction'
import type { AiAction, RewriteMode } from './api'

interface AiPanelProps {
  selectedText: string
  fullContent: string
  onReplaceSelection: (result: string) => void
  onInsert: (result: string) => void
  autoTriggerAction?: string | null
  onClearAutoTrigger?: () => void
}

const ACTIONS: { id: AiAction | RewriteMode; label: string }[] = [
  { id: 'summarize', label: 'Summarize' },
  { id: 'explain', label: 'Explain simply' },
  { id: 'key-points', label: 'Key points' },
  { id: 'questions', label: 'Quiz questions' },
  { id: 'flashcards', label: 'Flashcards' },
  { id: 'checklist', label: 'To checklist' },
  { id: 'table', label: 'To table' },
  { id: 'expand', label: 'Expand' },
  { id: 'shorten', label: 'Shorten' },
  { id: 'examples', label: 'Add examples' },
  { id: 'style', label: 'Rewrite in my style' },
  { id: 'format', label: 'Format with AI' }
]

function AiPanel({
  selectedText,
  fullContent,
  onReplaceSelection,
  onInsert,
  autoTriggerAction,
  onClearAutoTrigger
}: AiPanelProps): React.JSX.Element {
  const { result, loading, error, run, reset, cancel } = useAiAction()
  const [copied, setCopied] = useState(false)

  const hasSelection = selectedText.trim().length > 0
  const inputText = hasSelection ? selectedText : fullContent

  useEffect(() => {
    if (autoTriggerAction && inputText.trim()) {
      run(autoTriggerAction, inputText)
      onClearAutoTrigger?.()
    }
  }, [autoTriggerAction, inputText, run, onClearAutoTrigger])

  function handleRun(action: string): void {
    if (!inputText.trim()) return
    run(action, inputText)
  }

  async function handleCopy(): Promise<void> {
    await navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="border-b border-neutral-800 px-3 py-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium tracking-wide text-neutral-500 uppercase">AI</span>
        <span className="text-xs text-neutral-500">
          {hasSelection ? 'Using selected text' : 'Using whole note'}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-1">
        {ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => handleRun(action.id)}
            disabled={loading || !inputText.trim()}
            className="rounded-md bg-neutral-800 px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-700 disabled:opacity-40"
          >
            {action.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="mb-2 flex items-center gap-2 text-xs text-neutral-500">
          Generating…
          <button
            type="button"
            onClick={cancel}
            className="text-neutral-400 underline hover:text-neutral-200"
          >
            Cancel
          </button>
        </div>
      )}
      {error && <div className="mb-2 text-xs text-red-400">{error}</div>}

      {result && (
        <div className="space-y-2">
          <div className="max-h-64 overflow-auto rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm whitespace-pre-wrap text-neutral-200">
            {result}
          </div>
          <div className="flex gap-1">
            {hasSelection && (
              <button
                type="button"
                onClick={() => {
                  onReplaceSelection(result)
                  reset()
                }}
                className="rounded-md bg-neutral-800 px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-700"
              >
                Replace selection
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onInsert(result)
                reset()
              }}
              className="rounded-md bg-neutral-800 px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-700"
            >
              Insert below
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-md bg-neutral-800 px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-700"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AiPanel
