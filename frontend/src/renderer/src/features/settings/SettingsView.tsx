import { useEffect, useState } from 'react'
import { Check, Keyboard, Monitor, Sparkles, Sliders, X } from 'lucide-react'
import { useSettings } from './SettingsContext'
import { setMistralApiKey, setStyleExamples } from './api'
import { useAiAction } from '../ai/useAiAction'
import { useWorkspaces } from '../workspaces/useWorkspaces'
import Select from '../../components/ui/Select'

type SettingsTab = 'general' | 'editor' | 'ai' | 'shortcuts'

function rangeFillStyle(value: number, min: number, max: number): React.CSSProperties {
  const percent = ((value - min) / (max - min)) * 100
  return {
    background: `linear-gradient(to right, var(--color-amber-500) ${percent}%, var(--color-neutral-800) ${percent}%)`
  }
}

function SettingsView(): React.JSX.Element {
  const { settings, updateSettings, loading: settingsLoading } = useSettings()
  const { workspaces } = useWorkspaces()

  const [activeTab, setActiveTab] = useState<SettingsTab>('general')

  // API Key state
  const [apiKeyDraft, setApiKeyDraft] = useState('')
  const [savingKey, setSavingKey] = useState(false)
  const [keySaved, setKeySaved] = useState(false)

  // Style Examples state
  const [examples, setExamples] = useState<string[]>([])
  const [newExample, setNewExample] = useState('')
  const [savingExamples, setSavingExamples] = useState(false)

  // Tone Preview state
  const [previewText, setPreviewText] = useState(
    "I need to refactor this function because it's doing too much."
  )
  const {
    result: previewResult,
    loading: previewLoading,
    error: previewError,
    run: runPreview
  } = useAiAction()

  // Shortcut Recording state
  const [recordingShortcut, setRecordingShortcut] = useState<string | null>(null)

  useEffect(() => {
    if (settings) {
      Promise.resolve().then(() => {
        setExamples(settings.style_examples)
      })
    }
  }, [settings])

  if (settingsLoading || !settings) {
    return (
      <div className="flex h-full items-center justify-center bg-neutral-950 text-neutral-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-500 border-t-transparent" />
          <span className="text-sm">Loading preferences…</span>
        </div>
      </div>
    )
  }

  async function handleSaveKey(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    const key = apiKeyDraft.trim()
    if (!key) return
    setSavingKey(true)
    try {
      await setMistralApiKey(key)
      setApiKeyDraft('')
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
      const updated = await setStyleExamples([...examples, text])
      setExamples(updated)
      setNewExample('')
    } finally {
      setSavingExamples(false)
    }
  }

  async function handleRemoveExample(index: number): Promise<void> {
    setSavingExamples(true)
    try {
      const updated = await setStyleExamples(examples.filter((_, i) => i !== index))
      setExamples(updated)
    } finally {
      setSavingExamples(false)
    }
  }

  function handleRecordShortcutKeyDown(event: React.KeyboardEvent): void {
    if (!recordingShortcut || !settings) return
    event.preventDefault()
    event.stopPropagation()

    if (event.key === 'Escape') {
      setRecordingShortcut(null)
      return
    }

    // Skip modifier-only events
    if (['control', 'shift', 'alt', 'meta'].includes(event.key.toLowerCase())) {
      return
    }

    const parts: string[] = []
    if (event.ctrlKey) parts.push('Ctrl')
    if (event.metaKey) parts.push('Cmd')
    if (event.altKey) parts.push('Alt')
    if (event.shiftKey) parts.push('Shift')

    // Format the actual key cleanly
    const key = event.key.length === 1 ? event.key.toUpperCase() : event.key
    parts.push(key)

    const formattedShortcut = parts.join('+')

    updateSettings({
      keyboard_shortcuts: {
        ...settings.keyboard_shortcuts,
        [recordingShortcut]: formattedShortcut
      }
    })
    setRecordingShortcut(null)
  }

  return (
    <div className="flex h-full bg-neutral-950 text-neutral-100">
      {/* Settings Navigation Sidebar */}
      <aside className="w-56 shrink-0 border-r border-neutral-800 bg-neutral-900/50 p-4">
        <h1 className="mb-6 px-2 text-sm font-semibold tracking-wider text-neutral-400 uppercase">
          Settings
        </h1>
        <nav className="space-y-1">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'general'
                ? 'bg-neutral-800 text-neutral-100'
                : 'text-neutral-400 hover:bg-neutral-800/40 hover:text-neutral-200'
            }`}
          >
            <Monitor size={16} />
            General
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('editor')}
            className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'editor'
                ? 'bg-neutral-800 text-neutral-100'
                : 'text-neutral-400 hover:bg-neutral-800/40 hover:text-neutral-200'
            }`}
          >
            <Sliders size={16} />
            Editor
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'ai'
                ? 'bg-neutral-800 text-neutral-100'
                : 'text-neutral-400 hover:bg-neutral-800/40 hover:text-neutral-200'
            }`}
          >
            <Sparkles size={16} />
            AI & Tone
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('shortcuts')}
            className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'shortcuts'
                ? 'bg-neutral-800 text-neutral-100'
                : 'text-neutral-400 hover:bg-neutral-800/40 hover:text-neutral-200'
            }`}
          >
            <Keyboard size={16} />
            Shortcuts
          </button>
        </nav>
      </aside>

      {/* Settings Content Pane */}
      <main className="flex-1 overflow-y-auto px-10 py-8 max-w-3xl">
        {activeTab === 'general' && (
          <div className="space-y-12">
            <div>
              <h2 className="mb-1 text-base font-semibold text-neutral-100">General Settings</h2>
              <p className="text-xs text-neutral-400">
                Configure application appearance and launch default behavior.
              </p>
            </div>

            {/* Theme section */}
            <section className="space-y-3">
              <h3 className="text-sm font-medium text-neutral-200">Theme</h3>
              <div className="grid grid-cols-4 gap-3">
                {/* Dark Theme Card */}
                <button
                  type="button"
                  onClick={() => updateSettings({ theme: 'dark' })}
                  className={`relative flex flex-col gap-2 rounded-lg border p-3 text-left transition-all hover:border-neutral-500 ${
                    settings.theme === 'dark'
                      ? 'border-neutral-200 bg-neutral-900 shadow-lg'
                      : 'border-neutral-800 bg-neutral-900/30'
                  }`}
                >
                  <div className="flex h-10 w-full items-center gap-1 rounded p-1.5" style={{ background: '#0a0a0a' }}>
                    <div className="h-full w-3 rounded" style={{ background: '#171717' }} />
                    <div className="h-full flex-1 rounded" style={{ background: '#262626' }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Dark</span>
                    {settings.theme === 'dark' && <Check size={13} className="text-emerald-400" />}
                  </div>
                </button>

                {/* Light Theme Card */}
                <button
                  type="button"
                  onClick={() => updateSettings({ theme: 'light' })}
                  className={`relative flex flex-col gap-2 rounded-lg border p-3 text-left transition-all hover:border-neutral-400 ${
                    settings.theme === 'light'
                      ? 'border-neutral-400 bg-white/5 shadow-lg'
                      : 'border-neutral-800 bg-neutral-900/30'
                  }`}
                >
                  <div className="flex h-10 w-full items-center gap-1 rounded p-1.5" style={{ background: '#f5f5f5' }}>
                    <div className="h-full w-3 rounded" style={{ background: '#e5e5e5' }} />
                    <div className="h-full flex-1 rounded" style={{ background: '#d4d4d4' }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Light</span>
                    {settings.theme === 'light' && <Check size={13} className="text-neutral-500" />}
                  </div>
                </button>

                {/* Warm Cozy Theme Card */}
                <button
                  type="button"
                  onClick={() => updateSettings({ theme: 'warm-dark' })}
                  className={`relative flex flex-col gap-2 rounded-lg border p-3 text-left transition-all hover:border-neutral-500 ${
                    settings.theme === 'warm-dark'
                      ? 'border-neutral-200 bg-stone-900 shadow-lg'
                      : 'border-neutral-800 bg-stone-900/10'
                  }`}
                >
                  <div className="flex h-10 w-full items-center gap-1 rounded p-1.5" style={{ background: '#1c1917' }}>
                    <div className="h-full w-3 rounded" style={{ background: '#292524' }} />
                    <div className="h-full flex-1 rounded" style={{ background: '#44403c' }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Warm Cozy</span>
                    {settings.theme === 'warm-dark' && <Check size={13} className="text-emerald-400" />}
                  </div>
                </button>

                {/* Forest Dark Theme Card */}
                <button
                  type="button"
                  onClick={() => updateSettings({ theme: 'forest-dark' })}
                  className={`relative flex flex-col gap-2 rounded-lg border p-3 text-left transition-all ${
                    settings.theme === 'forest-dark'
                      ? 'border-green-600 shadow-lg shadow-green-900/30'
                      : 'border-neutral-800 bg-neutral-900/30 hover:border-green-800'
                  }`}
                >
                  <div className="flex h-10 w-full items-center gap-1 rounded p-1.5" style={{ background: '#0d1f12' }}>
                    <div className="h-full w-3 rounded" style={{ background: '#142a19' }} />
                    <div className="h-full flex-1 rounded" style={{ background: '#1e3d26' }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Forest</span>
                    {settings.theme === 'forest-dark' && <Check size={13} className="text-green-400" />}
                  </div>
                </button>

                {/* Ocean Blue Theme Card */}
                <button
                  type="button"
                  onClick={() => updateSettings({ theme: 'ocean-blue' })}
                  className={`relative flex flex-col gap-2 rounded-lg border p-3 text-left transition-all ${
                    settings.theme === 'ocean-blue'
                      ? 'border-blue-600 shadow-lg shadow-blue-900/30'
                      : 'border-neutral-800 bg-neutral-900/30 hover:border-blue-800'
                  }`}
                >
                  <div className="flex h-10 w-full items-center gap-1 rounded p-1.5" style={{ background: '#07111f' }}>
                    <div className="h-full w-3 rounded" style={{ background: '#0d1b2e' }} />
                    <div className="h-full flex-1 rounded" style={{ background: '#152844' }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Ocean</span>
                    {settings.theme === 'ocean-blue' && <Check size={13} className="text-blue-400" />}
                  </div>
                </button>

                {/* Nord Theme Card */}
                <button
                  type="button"
                  onClick={() => updateSettings({ theme: 'nord' })}
                  className={`relative flex flex-col gap-2 rounded-lg border p-3 text-left transition-all ${
                    settings.theme === 'nord'
                      ? 'border-sky-500 shadow-lg shadow-sky-900/20'
                      : 'border-neutral-800 bg-neutral-900/30 hover:border-sky-800'
                  }`}
                >
                  <div className="flex h-10 w-full items-center gap-1 rounded p-1.5" style={{ background: '#2e3440' }}>
                    <div className="h-full w-3 rounded" style={{ background: '#3b4252' }} />
                    <div className="h-full flex-1 rounded" style={{ background: '#434c5e' }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Nord</span>
                    {settings.theme === 'nord' && <Check size={13} className="text-sky-400" />}
                  </div>
                </button>

                {/* Solarized Light Theme Card */}
                <button
                  type="button"
                  onClick={() => updateSettings({ theme: 'solarized-light' })}
                  className={`relative flex flex-col gap-2 rounded-lg border p-3 text-left transition-all ${
                    settings.theme === 'solarized-light'
                      ? 'border-amber-500 shadow-lg shadow-amber-900/20'
                      : 'border-neutral-800 bg-neutral-900/30 hover:border-amber-700'
                  }`}
                >
                  <div className="flex h-10 w-full items-center gap-1 rounded p-1.5" style={{ background: '#fdf6e3' }}>
                    <div className="h-full w-3 rounded" style={{ background: '#eee8d5' }} />
                    <div className="h-full flex-1 rounded" style={{ background: '#ddd6c1' }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Solarized</span>
                    {settings.theme === 'solarized-light' && <Check size={13} className="text-amber-500" />}
                  </div>
                </button>
              </div>
            </section>


            {/* Launch Workspace */}
            <section className="space-y-2">
              <span className="block text-sm font-medium text-neutral-200">
                Default Workspace on Startup
              </span>
              <p className="text-xs text-neutral-500">
                Automatically load this workspace when opening the app.
              </p>
              <Select
                className="max-w-md"
                size="md"
                value={settings.default_workspace_id || ''}
                onChange={(value) => updateSettings({ default_workspace_id: value || null })}
                options={[
                  { value: '', label: 'None (Show Workspace Selection)' },
                  ...workspaces.map((ws) => ({ value: ws.id, label: ws.name }))
                ]}
              />
            </section>

            {/* Markdown Preferences */}
            <section className="space-y-2">
              <label
                htmlFor="defaultEditorMode"
                className="block text-sm font-medium text-neutral-200"
              >
                Default Note View Mode
              </label>
              <p className="text-xs text-neutral-500">
                Choose the editor layout to use by default when opening notes.
              </p>
              <div className="flex gap-2">
                {(['split', 'edit', 'preview'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => updateSettings({ default_editor_mode: mode })}
                    className={`rounded-md border px-4 py-2 text-xs font-medium capitalize transition-colors ${
                      settings.default_editor_mode === mode
                        ? 'border-neutral-400 bg-neutral-800 text-neutral-100'
                        : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {mode} view
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'editor' && (
          <div className="space-y-12">
            <div>
              <h2 className="mb-1 text-base font-semibold text-neutral-100">Editor Settings</h2>
              <p className="text-xs text-neutral-400">
                Customize the writing environment, font choices, and autosave parameters.
              </p>
            </div>

            {/* Editor Font Family */}
            <section className="space-y-2">
              <label htmlFor="editorFont" className="block text-sm font-medium text-neutral-200">
                Editor Font Family
              </label>
              <div className="flex max-w-md gap-2">
                <input
                  id="editorFont"
                  type="text"
                  value={settings.editor_font}
                  onChange={(e) => updateSettings({ editor_font: e.target.value })}
                  placeholder="e.g. JetBrains Mono, monospace"
                  className="min-w-0 flex-1 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-200 focus:border-neutral-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => updateSettings({ editor_font: 'monospace' })}
                  className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-neutral-200"
                >
                  Reset
                </button>
              </div>
              <p className="text-[10px] text-neutral-500">
                Will fall back to local system fonts if the specific font is unavailable.
              </p>
            </section>

            {/* Font Size */}
            <section className="space-y-2">
              <div className="flex items-center justify-between max-w-md">
                <label htmlFor="fontSize" className="text-sm font-medium text-neutral-200">
                  Font Size
                </label>
                <span className="text-xs font-semibold text-neutral-400">
                  {settings.font_size}px
                </span>
              </div>
              <div className="flex items-center gap-3 max-w-md">
                <span className="text-xs text-neutral-500">12px</span>
                <input
                  id="fontSize"
                  type="range"
                  min="12"
                  max="24"
                  step="1"
                  value={settings.font_size}
                  onChange={(e) => updateSettings({ font_size: parseInt(e.target.value, 10) })}
                  style={rangeFillStyle(settings.font_size, 12, 24)}
                  className="range-slider flex-1"
                />
                <span className="text-xs text-neutral-500">24px</span>
              </div>
            </section>

            {/* Autosave behavior */}
            <section className="space-y-2">
              <div className="flex items-center justify-between max-w-md">
                <label htmlFor="autosaveDelay" className="text-sm font-medium text-neutral-200">
                  Autosave Debounce Delay
                </label>
                <span className="text-xs font-semibold text-neutral-400">
                  {settings.autosave_delay}ms
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                Number of milliseconds to wait after the last keypress before saving changes.
              </p>
              <div className="flex items-center gap-3 max-w-md mt-1">
                <span className="text-xs text-neutral-500">200ms</span>
                <input
                  id="autosaveDelay"
                  type="range"
                  min="200"
                  max="3000"
                  step="100"
                  value={settings.autosave_delay}
                  onChange={(e) => updateSettings({ autosave_delay: parseInt(e.target.value, 10) })}
                  style={rangeFillStyle(settings.autosave_delay, 200, 3000)}
                  className="range-slider flex-1"
                />
                <span className="text-xs text-neutral-500">3s</span>
              </div>
            </section>

            {/* Live editor preview style */}
            <section className="max-w-md rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
              <h4 className="mb-2 text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Font Preview
              </h4>
              <div
                style={{ fontFamily: settings.editor_font, fontSize: `${settings.font_size}px` }}
                className="rounded border border-neutral-800 bg-neutral-950 p-3 leading-relaxed text-neutral-300"
              >
                # Quick Notes
                <br />- Debounced autosave delay: {settings.autosave_delay}ms
                <br />- Editor mode: {settings.default_editor_mode}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="space-y-12">
            <div>
              <h2 className="mb-1 text-base font-semibold text-neutral-100">AI & Writing Style</h2>
              <p className="text-xs text-neutral-400">
                Configure settings for the Mistral API and personal style rewrite capabilities.
              </p>
            </div>

            {/* API Key configuration */}
            <section className="space-y-3">
              <h3 className="text-sm font-medium text-neutral-200">Mistral API Key</h3>
              <p className="text-xs text-neutral-500">
                Required for all AI-assisted features. Key is stored strictly on your local device.
              </p>
              <div className="mb-2 text-xs">
                {settings.mistral_api_key_configured ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Key Configured
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-neutral-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-neutral-500" />
                    No Active Key
                  </span>
                )}
              </div>
              <form onSubmit={handleSaveKey} className="flex items-center gap-2 max-w-md">
                <input
                  type="password"
                  value={apiKeyDraft}
                  onChange={(event) => setApiKeyDraft(event.target.value)}
                  placeholder={
                    settings.mistral_api_key_configured
                      ? '••••••••••••••••••••••••••••••••'
                      : 'Paste Mistral API Key…'
                  }
                  className="min-w-0 flex-1 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-200 placeholder:text-neutral-600 focus:border-neutral-600 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={savingKey || !apiKeyDraft.trim()}
                  className="shrink-0 rounded-md bg-neutral-800 hover:bg-neutral-700 px-4 py-1.5 text-sm text-neutral-200 disabled:opacity-40"
                >
                  {savingKey ? 'Saving…' : 'Save'}
                </button>
              </form>
              {keySaved && <div className="mt-1 text-xs text-emerald-400">API key saved.</div>}
            </section>

            {/* Style Examples section */}
            <section className="space-y-3">
              <h3 className="text-sm font-medium text-neutral-200">Style Examples</h3>
              <p className="text-xs text-neutral-500">
                Paste short paragraphs of your own writing. The AI will analyze these to match your
                unique writing style.
              </p>
              {examples.length === 0 ? (
                <div className="rounded-md border border-dashed border-neutral-800 p-4 text-center text-xs text-neutral-500">
                  No examples added yet.
                </div>
              ) : (
                <ul className="space-y-2">
                  {examples.map((example, index) => (
                    <li
                      key={index}
                      className="flex items-start justify-between gap-3 rounded-md border border-neutral-800 bg-neutral-900/50 p-3 text-xs text-neutral-300"
                    >
                      <span className="min-w-0 flex-1 whitespace-pre-wrap">{example}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveExample(index)}
                        aria-label={`Remove example ${index + 1}`}
                        className="shrink-0 text-neutral-500 hover:text-red-400 text-sm"
                      >
                        <X size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <form onSubmit={handleAddExample} className="flex items-start gap-2 max-w-lg">
                <textarea
                  value={newExample}
                  onChange={(event) => setNewExample(event.target.value)}
                  placeholder="Paste a short sample of your writing style here…"
                  rows={3}
                  className="min-w-0 flex-1 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-200 placeholder:text-neutral-600 focus:border-neutral-600 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={savingExamples || !newExample.trim()}
                  className="shrink-0 rounded-md bg-neutral-800 hover:bg-neutral-700 px-4 py-1.5 text-sm text-neutral-200 disabled:opacity-40"
                >
                  Add
                </button>
              </form>
            </section>

            {/* Preview rewrite in my style */}
            <section className="space-y-3">
              <h3 className="text-sm font-medium text-neutral-200">Preview Style Tone</h3>
              <p className="text-xs text-neutral-500">
                Test how the style tone modifier rewrites text in your style.
              </p>
              <textarea
                value={previewText}
                onChange={(event) => setPreviewText(event.target.value)}
                rows={2}
                className="w-full max-w-lg rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-200 focus:border-neutral-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => runPreview('style', previewText)}
                disabled={
                  previewLoading || !previewText.trim() || !settings.mistral_api_key_configured
                }
                className="rounded-md bg-neutral-800 hover:bg-neutral-700 px-4 py-1.5 text-sm text-neutral-200 disabled:opacity-40"
              >
                {previewLoading ? 'Generating…' : 'Preview Rewrite'}
              </button>
              {previewError && <div className="text-xs text-red-400 mt-2">{previewError}</div>}
              {previewResult && (
                <div className="max-w-lg rounded-md border border-neutral-800 bg-neutral-950 p-3 text-xs leading-relaxed text-neutral-300">
                  {previewResult}
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === 'shortcuts' && (
          <div className="space-y-12">
            <div>
              <h2 className="mb-1 text-base font-semibold text-neutral-100">Keyboard Shortcuts</h2>
              <p className="text-xs text-neutral-400">
                View defaults or configure customized triggers for rapid navigation.
              </p>
            </div>

            {/* Custom Shortcut Recorder */}
            <section className="space-y-3">
              <h3 className="text-sm font-medium text-neutral-200">Custom Shortcuts</h3>
              <div className="max-w-md rounded-md border border-neutral-800 bg-neutral-900/30 p-4 space-y-4">
                {/* Command Palette */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-neutral-200">Command Palette</h4>
                    <p className="text-[10px] text-neutral-500">
                      Shortcut trigger for opening command panel.
                    </p>
                  </div>
                  {recordingShortcut === 'command_palette' ? (
                    <input
                      autoFocus
                      placeholder="Press shortcut keys…"
                      onKeyDown={handleRecordShortcutKeyDown}
                      className="w-36 rounded-md border border-amber-500 bg-neutral-950 px-2.5 py-1 text-center text-xs text-amber-400 placeholder:text-amber-500/70 focus:outline-none"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <kbd className="rounded bg-neutral-800 px-2 py-1 text-xs font-mono text-neutral-300 border border-neutral-700">
                        {settings.keyboard_shortcuts.command_palette || 'Ctrl+Shift+P'}
                      </kbd>
                      <button
                        type="button"
                        onClick={() => setRecordingShortcut('command_palette')}
                        className="rounded border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-[10px] font-medium text-neutral-400 hover:text-neutral-200"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>

                {/* Global Capture */}
                <div className="flex items-center justify-between border-t border-neutral-800/40 pt-4">
                  <div>
                    <h4 className="text-xs font-semibold text-neutral-200">Global Text Capture</h4>
                    <p className="text-[10px] text-neutral-500">
                      System-wide shortcut to grab selected text.
                    </p>
                  </div>
                  {recordingShortcut === 'global_capture' ? (
                    <input
                      autoFocus
                      placeholder="Press shortcut keys…"
                      onKeyDown={handleRecordShortcutKeyDown}
                      className="w-36 rounded-md border border-amber-500 bg-neutral-950 px-2.5 py-1 text-center text-xs text-amber-400 placeholder:text-amber-500/70 focus:outline-none"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <kbd className="rounded bg-neutral-800 px-2 py-1 text-xs font-mono text-neutral-300 border border-neutral-700">
                        {settings.keyboard_shortcuts.global_capture || 'Ctrl+Alt+Shift+C'}
                      </kbd>
                      <button
                        type="button"
                        onClick={() => setRecordingShortcut('global_capture')}
                        className="rounded border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-[10px] font-medium text-neutral-400 hover:text-neutral-200"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>

                {/* Mini-Tray Toggle */}
                <div className="flex items-center justify-between border-t border-neutral-800/40 pt-4">
                  <div>
                    <h4 className="text-xs font-semibold text-neutral-200">Mini-Tray Toggle</h4>
                    <p className="text-[10px] text-neutral-500">
                      Show/hide the always-on-top mini note editor.
                    </p>
                  </div>
                  {recordingShortcut === 'mini_tray_toggle' ? (
                    <input
                      autoFocus
                      placeholder="Press shortcut keys…"
                      onKeyDown={handleRecordShortcutKeyDown}
                      className="w-36 rounded-md border border-amber-500 bg-neutral-950 px-2.5 py-1 text-center text-xs text-amber-400 placeholder:text-amber-500/70 focus:outline-none"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <kbd className="rounded bg-neutral-800 px-2 py-1 text-xs font-mono text-neutral-300 border border-neutral-700">
                        {settings.keyboard_shortcuts.mini_tray_toggle || 'Ctrl+Alt+Shift+M'}
                      </kbd>
                      <button
                        type="button"
                        onClick={() => setRecordingShortcut('mini_tray_toggle')}
                        className="rounded border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-[10px] font-medium text-neutral-400 hover:text-neutral-200"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Shortcuts Reference List */}
            <section className="space-y-3">
              <h3 className="text-sm font-medium text-neutral-200">General Cheat-sheet</h3>
              <div className="max-w-lg divide-y divide-neutral-800 rounded-md border border-neutral-800 bg-neutral-900/30">
                {[
                  { action: 'Bold Selected Text', keys: ['Ctrl+B', 'Cmd+B'] },
                  { action: 'Italicize Selected Text', keys: ['Ctrl+I', 'Cmd+I'] },
                  {
                    action: 'Trigger Command Palette',
                    keys: [settings.keyboard_shortcuts.command_palette || 'Ctrl+Shift+P']
                  },
                  {
                    action: 'Global Text Capture',
                    keys: [settings.keyboard_shortcuts.global_capture || 'Ctrl+Alt+Shift+C']
                  },
                  {
                    action: 'Toggle Mini-Tray',
                    keys: [settings.keyboard_shortcuts.mini_tray_toggle || 'Ctrl+Alt+Shift+M']
                  },
                  { action: 'Cancel Palette / Focus', keys: ['Esc'] }
                ].map((row) => (
                  <div key={row.action} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-xs text-neutral-300">{row.action}</span>
                    <span className="flex items-center gap-1.5">
                      {row.keys.map((key, index) => (
                        <span key={key} className="flex items-center gap-1.5">
                          {index > 0 && <span className="text-[10px] text-neutral-500">or</span>}
                          <kbd className="rounded bg-neutral-900 border border-neutral-700 px-1.5 py-0.5 font-mono text-[10px] text-neutral-300">
                            {key}
                          </kbd>
                        </span>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}

export default SettingsView
