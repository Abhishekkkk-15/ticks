import { useEffect, useState } from 'react'
import { getSettings, setMistralApiKey, setStyleExamples } from './api'
import { useAiAction } from '../ai/useAiAction'

function SettingsView(): React.JSX.Element {
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [apiKeyDraft, setApiKeyDraft] = useState('')
  const [savingKey, setSavingKey] = useState(false)
  const [keySaved, setKeySaved] = useState(false)

  const [examples, setExamples] = useState<string[]>([])
  const [newExample, setNewExample] = useState('')
  const [savingExamples, setSavingExamples] = useState(false)

  const [previewText, setPreviewText] = useState(
    "I need to refactor this function because it's doing too much."
  )
  const {
    result: previewResult,
    loading: previewLoading,
    error: previewError,
    run: runPreview
  } = useAiAction()

  useEffect(() => {
    let cancelled = false

    async function load(): Promise<void> {
      const info = await getSettings()
      if (cancelled) return
      setConfigured(info.mistral_api_key_configured)
      setExamples(info.style_examples)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  async function handleSaveKey(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    const key = apiKeyDraft.trim()
    if (!key) return
    setSavingKey(true)
    try {
      await setMistralApiKey(key)
      setApiKeyDraft('')
      setConfigured(true)
      setKeySaved(true)
      setTimeout(() => setKeySaved(false), 2000)
    } finally {
      setSavingKey(false)
    }
  }

  async function handleAddExample(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    const text = newExample.trim()
    if (!text) return
    setSavingExamples(true)
    try {
      setExamples(await setStyleExamples([...examples, text]))
      setNewExample('')
    } finally {
      setSavingExamples(false)
    }
  }

  async function handleRemoveExample(index: number): Promise<void> {
    setSavingExamples(true)
    try {
      setExamples(await setStyleExamples(examples.filter((_, i) => i !== index)))
    } finally {
      setSavingExamples(false)
    }
  }

  return (
    <div className="mx-auto h-full max-w-2xl overflow-auto px-6 py-8">
      <h1 className="mb-6 text-lg font-semibold text-neutral-100">Settings</h1>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-medium text-neutral-300">Mistral API key</h2>
        <p className="mb-3 text-xs text-neutral-500">
          Used for all AI features (summarize, explain, rewrite, etc). Stored locally, only ever
          sent directly to Mistral.
        </p>
        <div className="mb-2 text-xs">
          {configured === null ? null : configured ? (
            <span className="text-emerald-400">● Configured</span>
          ) : (
            <span className="text-neutral-500">○ Not configured</span>
          )}
        </div>
        <form onSubmit={handleSaveKey} className="flex items-center gap-2">
          <input
            type="password"
            value={apiKeyDraft}
            onChange={(event) => setApiKeyDraft(event.target.value)}
            placeholder={configured ? 'Replace API key…' : 'Paste your Mistral API key…'}
            className="min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200 placeholder:text-neutral-500 focus:ring-1 focus:ring-neutral-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={savingKey || !apiKeyDraft.trim()}
            className="shrink-0 rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-700 disabled:opacity-40"
          >
            {savingKey ? 'Saving…' : 'Save'}
          </button>
        </form>
        {keySaved && <div className="mt-1 text-xs text-emerald-400">Saved.</div>}
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-medium text-neutral-300">Writing style examples</h2>
        <p className="mb-3 text-xs text-neutral-500">
          Paste a few examples of your own writing. &ldquo;Rewrite in my style&rdquo; matches their
          tone — not their content.
        </p>
        {examples.length === 0 ? (
          <div className="mb-3 text-xs text-neutral-500">No examples yet.</div>
        ) : (
          <ul className="mb-3 space-y-2">
            {examples.map((example, index) => (
              <li
                key={index}
                className="flex items-start justify-between gap-2 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-300"
              >
                <span className="min-w-0 flex-1 whitespace-pre-wrap">{example}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveExample(index)}
                  aria-label={`Remove example ${index + 1}`}
                  className="shrink-0 text-neutral-500 hover:text-red-400"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={handleAddExample} className="flex items-start gap-2">
          <textarea
            value={newExample}
            onChange={(event) => setNewExample(event.target.value)}
            placeholder="Paste a paragraph you've written…"
            rows={3}
            className="min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200 placeholder:text-neutral-500 focus:ring-1 focus:ring-neutral-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={savingExamples || !newExample.trim()}
            className="shrink-0 rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-700 disabled:opacity-40"
          >
            Add
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-neutral-300">
          Preview &ldquo;rewrite in my style&rdquo;
        </h2>
        <textarea
          value={previewText}
          onChange={(event) => setPreviewText(event.target.value)}
          rows={2}
          className="mb-2 w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200 focus:ring-1 focus:ring-neutral-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => runPreview('style', previewText)}
          disabled={previewLoading || !previewText.trim() || !configured}
          className="mb-3 rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-700 disabled:opacity-40"
        >
          {previewLoading ? 'Generating…' : 'Preview'}
        </button>
        {previewError && <div className="mb-2 text-xs text-red-400">{previewError}</div>}
        {previewResult && (
          <div className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm whitespace-pre-wrap text-neutral-200">
            {previewResult}
          </div>
        )}
      </section>
    </div>
  )
}

export default SettingsView
