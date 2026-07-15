import { useEffect, useState } from 'react'
import { Check, Keyboard, Monitor, Sparkles, Sliders, Trash2, Terminal, X, Zap, Cloud } from 'lucide-react'
import { useSettings } from './SettingsContext'
import { setMistralApiKey, setStyleExamples } from './api'
import { useAiAction } from '../ai/useAiAction'
import { useWorkspaces } from '../workspaces/useWorkspaces'
import Select from '../../components/ui/Select'
import FontPicker from './FontPicker'
import MCPView from '../mcp/MCPView'
import CloudSyncView from './CloudSyncView'
import {
  WORKFLOW_ACTIONS,
  WORKFLOW_OUTPUT_MODE_LABELS
} from '../workflows/runWorkflows'
import type { Workflow, WorkflowTrigger, WorkflowOutputMode } from './types'

type SettingsTab = 'general' | 'editor' | 'ai' | 'shortcuts' | 'workflows' | 'mcp' | 'cloud'

const TRIGGER_OPTIONS: { value: WorkflowTrigger; label: string }[] = [
  { value: 'on_save', label: 'On save' },
  { value: 'on_capture', label: 'On Global Text Capture' },
  { value: 'on_paste', label: 'On paste' },
  { value: 'shortcut', label: 'Keyboard shortcut' }
]

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

  // Workflow draft state
  const [workflowName, setWorkflowName] = useState('')
  const [workflowTrigger, setWorkflowTrigger] = useState<WorkflowTrigger>('on_save')
  const [workflowShortcut, setWorkflowShortcut] = useState('')
  const [workflowActions, setWorkflowActions] = useState<string[]>([])
  const [nextWorkflowAction, setNextWorkflowAction] = useState(WORKFLOW_ACTIONS[0].id)
  const [workflowOutputMode, setWorkflowOutputMode] = useState<WorkflowOutputMode>('append')
  const [recordingWorkflowShortcut, setRecordingWorkflowShortcut] = useState(false)


  useEffect(() => {
    function handleNavigate(event: Event): void {
      const customEvent = event as CustomEvent<{ tab: SettingsTab }>
      setActiveTab(customEvent.detail.tab)
    }
    window.addEventListener('settings:navigate', handleNavigate)
    return () => window.removeEventListener('settings:navigate', handleNavigate)
  }, [])

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

  function handleRecordWorkflowShortcutKeyDown(event: React.KeyboardEvent): void {
    if (!recordingWorkflowShortcut) return
    event.preventDefault()
    event.stopPropagation()

    if (event.key === 'Escape') {
      setRecordingWorkflowShortcut(false)
      return
    }

    if (['control', 'shift', 'alt', 'meta'].includes(event.key.toLowerCase())) {
      return
    }

    const parts: string[] = []
    if (event.ctrlKey) parts.push('Ctrl')
    if (event.metaKey) parts.push('Cmd')
    if (event.altKey) parts.push('Alt')
    if (event.shiftKey) parts.push('Shift')

    const key = event.key.length === 1 ? event.key.toUpperCase() : event.key
    parts.push(key)

    setWorkflowShortcut(parts.join('+'))
    setRecordingWorkflowShortcut(false)
  }

  function handleAddWorkflowAction(): void {
    setWorkflowActions((actions) => [...actions, nextWorkflowAction])
  }

  function handleRemoveWorkflowAction(index: number): void {
    setWorkflowActions((actions) => actions.filter((_, i) => i !== index))
  }

  function handleMoveWorkflowAction(index: number, direction: -1 | 1): void {
    setWorkflowActions((actions) => {
      const target = index + direction
      if (target < 0 || target >= actions.length) return actions
      const copy = [...actions]
      ;[copy[index], copy[target]] = [copy[target], copy[index]]
      return copy
    })
  }

  function handleCreateWorkflow(event: React.FormEvent): void {
    event.preventDefault()
    if (!settings) return
    const name = workflowName.trim()
    if (!name) return
    if (workflowTrigger === 'shortcut' && !workflowShortcut) return
    if (workflowActions.length === 0) return

    const newWorkflow: Workflow = {
      id: crypto.randomUUID(),
      name: workflowName.trim(),
      trigger: workflowTrigger,
      scope: 'full_note',
      output_mode: workflowOutputMode,
      shortcut: workflowTrigger === 'shortcut' ? workflowShortcut : null,
      actions: workflowActions
    }
    updateSettings({ workflows: [...settings.workflows, newWorkflow] })
    setWorkflowName('')
    setWorkflowTrigger('on_save')
    setWorkflowShortcut('')
    setWorkflowActions([])
    setWorkflowOutputMode('append')
    setNextWorkflowAction(WORKFLOW_ACTIONS[0].id)
  }

  function handleDeleteWorkflow(id: string): void {
    if (!settings) return
    updateSettings({ workflows: settings.workflows.filter((w) => w.id !== id) })
  }

  return (
    <div className="flex flex-col md:flex-row h-full bg-neutral-950 text-neutral-100">
      {/* Settings Navigation Sidebar */}
      <aside className="w-full md:w-56 shrink-0 border-b md:border-b-0 md:border-r border-neutral-800 bg-neutral-900/50 p-4">
        <h1 className="hidden md:block mb-6 px-2 text-sm font-semibold tracking-wider text-neutral-400 uppercase">
          Settings
        </h1>
        <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`flex shrink-0 w-auto md:w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
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
            className={`flex shrink-0 w-auto md:w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
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
            className={`flex shrink-0 w-auto md:w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
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
            className={`flex shrink-0 w-auto md:w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'shortcuts'
                ? 'bg-neutral-800 text-neutral-100'
                : 'text-neutral-400 hover:bg-neutral-800/40 hover:text-neutral-200'
            }`}
          >
            <Keyboard size={16} />
            Shortcuts
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('workflows')}
            className={`flex shrink-0 w-auto md:w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'workflows'
                ? 'bg-neutral-800 text-neutral-100'
                : 'text-neutral-400 hover:bg-neutral-800/40 hover:text-neutral-200'
            }`}
          >
            <Zap size={16} />
            Workflows
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mcp')}
            className={`flex shrink-0 w-auto md:w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'mcp'
                ? 'bg-neutral-800 text-neutral-100'
                : 'text-neutral-400 hover:bg-neutral-800/40 hover:text-neutral-200'
            }`}
          >
            <Terminal size={16} />
            MCP Server
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cloud')}
            className={`flex shrink-0 w-auto md:w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'cloud'
                ? 'bg-neutral-800 text-neutral-100'
                : 'text-neutral-400 hover:bg-neutral-800/40 hover:text-neutral-200'
            }`}
          >
            <Cloud size={16} />
            Cloud Sync
          </button>
        </nav>
      </aside>

      {/* Settings Content Pane */}
      <main className="flex-1 overflow-y-auto px-4 md:px-10 py-6 md:py-8 w-full">
        <div className="max-w-3xl w-full">
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
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
                  <div
                    className="flex h-10 w-full items-center gap-1 rounded p-1.5"
                    style={{ background: '#0a0a0a' }}
                  >
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
                  <div
                    className="flex h-10 w-full items-center gap-1 rounded p-1.5"
                    style={{ background: '#f5f5f5' }}
                  >
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
                  <div
                    className="flex h-10 w-full items-center gap-1 rounded p-1.5"
                    style={{ background: '#1c1917' }}
                  >
                    <div className="h-full w-3 rounded" style={{ background: '#292524' }} />
                    <div className="h-full flex-1 rounded" style={{ background: '#44403c' }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Warm Cozy</span>
                    {settings.theme === 'warm-dark' && (
                      <Check size={13} className="text-emerald-400" />
                    )}
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
                  <div
                    className="flex h-10 w-full items-center gap-1 rounded p-1.5"
                    style={{ background: '#0d1f12' }}
                  >
                    <div className="h-full w-3 rounded" style={{ background: '#142a19' }} />
                    <div className="h-full flex-1 rounded" style={{ background: '#1e3d26' }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Forest</span>
                    {settings.theme === 'forest-dark' && (
                      <Check size={13} className="text-green-400" />
                    )}
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
                  <div
                    className="flex h-10 w-full items-center gap-1 rounded p-1.5"
                    style={{ background: '#07111f' }}
                  >
                    <div className="h-full w-3 rounded" style={{ background: '#0d1b2e' }} />
                    <div className="h-full flex-1 rounded" style={{ background: '#152844' }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Ocean</span>
                    {settings.theme === 'ocean-blue' && (
                      <Check size={13} className="text-blue-400" />
                    )}
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
                  <div
                    className="flex h-10 w-full items-center gap-1 rounded p-1.5"
                    style={{ background: '#2e3440' }}
                  >
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
                  <div
                    className="flex h-10 w-full items-center gap-1 rounded p-1.5"
                    style={{ background: '#fdf6e3' }}
                  >
                    <div className="h-full w-3 rounded" style={{ background: '#eee8d5' }} />
                    <div className="h-full flex-1 rounded" style={{ background: '#ddd6c1' }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Solarized</span>
                    {settings.theme === 'solarized-light' && (
                      <Check size={13} className="text-amber-500" />
                    )}
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

            {/* Mini-Tray Size */}
            <section className="space-y-2">
              <label htmlFor="miniTraySize" className="block text-sm font-medium text-neutral-200">
                Mini-Tray Size
              </label>
              <p className="text-xs text-neutral-500">
                Size of the always-on-top quick-note window.
              </p>
              <div className="flex gap-2">
                {(['compact', 'default', 'tall'] as const).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => updateSettings({ mini_tray_size: size })}
                    className={`rounded-md border px-4 py-2 text-xs font-medium capitalize transition-colors ${
                      settings.mini_tray_size === size
                        ? 'border-neutral-400 bg-neutral-800 text-neutral-100'
                        : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {size}
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
              <FontPicker
                value={settings.editor_font}
                onChange={(font) => updateSettings({ editor_font: font })}
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateSettings({ editor_font: 'monospace' })}
                  className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-neutral-200"
                >
                  Reset to default
                </button>
              </div>
              <p className="text-[10px] text-neutral-500">
                Picks from fonts installed on your system. Falls back to monospace if unavailable.
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
                <div>
                  <label htmlFor="autosaveEnabled" className="text-sm font-medium text-neutral-200">
                    Autosave
                  </label>
                  <p className="text-xs text-neutral-500">When off, save manually with Ctrl+S.</p>
                </div>
                <button
                  id="autosaveEnabled"
                  type="button"
                  role="switch"
                  aria-checked={settings.autosave_enabled}
                  onClick={() => updateSettings({ autosave_enabled: !settings.autosave_enabled })}
                  className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                    settings.autosave_enabled ? 'bg-emerald-600' : 'bg-neutral-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                      settings.autosave_enabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div
                className={`flex items-center justify-between max-w-md ${!settings.autosave_enabled ? 'opacity-40' : ''}`}
              >
                <label htmlFor="autosaveDelay" className="text-sm font-medium text-neutral-200">
                  Autosave Debounce Delay
                </label>
                <span className="text-xs font-semibold text-neutral-400">
                  {settings.autosave_delay}ms
                </span>
              </div>
              <p
                className={`text-xs text-neutral-500 ${!settings.autosave_enabled ? 'opacity-40' : ''}`}
              >
                Number of milliseconds to wait after the last keypress before saving changes.
              </p>
              <div
                className={`flex items-center gap-3 max-w-md mt-1 ${!settings.autosave_enabled ? 'opacity-40' : ''}`}
              >
                <span className="text-xs text-neutral-500">200ms</span>
                <input
                  id="autosaveDelay"
                  type="range"
                  min="200"
                  max="3000"
                  step="100"
                  disabled={!settings.autosave_enabled}
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

                {/* AI Assistant */}
                <div className="flex items-center justify-between border-t border-neutral-800/40 pt-4">
                  <div>
                    <h4 className="text-xs font-semibold text-neutral-200">AI Assistant Panel</h4>
                    <p className="text-[10px] text-neutral-500">
                      Shortcut to trigger AI Panel inside the editor.
                    </p>
                  </div>
                  {recordingShortcut === 'trigger_ai' ? (
                    <input
                      autoFocus
                      placeholder="Press shortcut keys…"
                      onKeyDown={handleRecordShortcutKeyDown}
                      className="w-36 rounded-md border border-amber-500 bg-neutral-950 px-2.5 py-1 text-center text-xs text-amber-400 placeholder:text-amber-500/70 focus:outline-none"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <kbd className="rounded bg-neutral-800 px-2 py-1 text-xs font-mono text-neutral-300 border border-neutral-700">
                        {settings.keyboard_shortcuts.trigger_ai || 'Ctrl+Shift+A'}
                      </kbd>
                      <button
                        type="button"
                        onClick={() => setRecordingShortcut('trigger_ai')}
                        className="rounded border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-[10px] font-medium text-neutral-400 hover:text-neutral-200"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>

                {/* Specific AI Actions */}
                {WORKFLOW_ACTIONS.map((action) => {
                  const key = `ai_${action.id}`
                  return (
                    <div
                      key={action.id}
                      className="flex items-center justify-between border-t border-neutral-800/40 pt-4"
                    >
                      <div>
                        <h4 className="text-xs font-semibold text-neutral-200">AI: {action.label}</h4>
                        <p className="text-[10px] text-neutral-500">
                          Trigger '{action.label}' on selected text.
                        </p>
                      </div>
                      {recordingShortcut === key ? (
                        <input
                          autoFocus
                          placeholder="Press shortcut keys…"
                          onKeyDown={handleRecordShortcutKeyDown}
                          className="w-36 rounded-md border border-amber-500 bg-neutral-950 px-2.5 py-1 text-center text-xs text-amber-400 placeholder:text-amber-500/70 focus:outline-none"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <kbd className="rounded bg-neutral-800 px-2 py-1 text-xs font-mono text-neutral-300 border border-neutral-700">
                            {settings.keyboard_shortcuts[key] || 'Not assigned'}
                          </kbd>
                          <button
                            type="button"
                            onClick={() => setRecordingShortcut(key)}
                            className="rounded border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-[10px] font-medium text-neutral-400 hover:text-neutral-200"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
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
                  {
                    action: 'Toggle AI Panel',
                    keys: [settings.keyboard_shortcuts.trigger_ai || 'Ctrl+Shift+A']
                  },
                  ...WORKFLOW_ACTIONS.filter((action) => settings.keyboard_shortcuts[`ai_${action.id}`]).map((action) => ({
                    action: `AI: ${action.label}`,
                    keys: [settings.keyboard_shortcuts[`ai_${action.id}`]]
                  })),
                  { action: 'New Note', keys: ['Ctrl+N'] },
                  { action: 'Close Active Tab', keys: ['Ctrl+Shift+W'] },
                  { action: 'Next / Previous Tab', keys: ['Ctrl+Tab', 'Ctrl+Shift+Tab'] },
                  { action: 'Toggle Sidebar', keys: ['Ctrl+\\'] },
                  { action: 'Focus Search', keys: ['Ctrl+Shift+F'] },
                  { action: 'Duplicate Note', keys: ['Ctrl+D'] },
                  { action: 'Delete Note (to Trash)', keys: ['Ctrl+Shift+Backspace'] },
                  { action: 'Save Note Now', keys: ['Ctrl+S'] },
                  { action: 'Toggle Edit / Preview', keys: ['Ctrl+E', 'Cmd+E'] },
                  { action: 'Toggle Formatting Toolbar', keys: ['Ctrl+Shift+T'] },
                  { action: 'Focus Editor', keys: ['Ctrl+Shift+E'] },
                  { action: 'Open Settings', keys: ['Ctrl+,'] },
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

        {activeTab === 'workflows' && (
          <div className="space-y-12">
            <div>
              <h2 className="mb-1 text-base font-semibold text-neutral-100">Workflows</h2>
              <p className="text-xs text-neutral-400">
                Automate AI actions to run on save, copy, paste, or a shortcut of your choosing.
              </p>
            </div>

            <section className="space-y-3">
              <h3 className="text-sm font-medium text-neutral-200">Configured Workflows</h3>
              {settings.workflows.length === 0 ? (
                <p className="max-w-lg rounded-md border border-neutral-800 bg-neutral-900/30 px-4 py-6 text-center text-xs text-neutral-500">
                  No workflows yet. Create one below.
                </p>
              ) : (
                <div className="max-w-lg divide-y divide-neutral-800 rounded-md border border-neutral-800 bg-neutral-900/30">
                  {settings.workflows.map((workflow) => (
                    <div
                      key={workflow.id}
                      className="flex items-center justify-between px-4 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium text-neutral-200">
                          {workflow.name}
                        </div>
                        <div className="truncate text-[10px] text-neutral-500">
                          {TRIGGER_OPTIONS.find((t) => t.value === workflow.trigger)?.label}
                          {workflow.trigger === 'shortcut' && workflow.shortcut
                            ? ` (${workflow.shortcut})`
                            : ''}
                          {` (${WORKFLOW_OUTPUT_MODE_LABELS[workflow.output_mode ?? 'append']})`}
                          {' → '}
                          {workflow.actions
                            .map(
                              (a) => WORKFLOW_ACTIONS.find((wa) => wa.id === a)?.label ?? a
                            )
                            .join(' → ')}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteWorkflow(workflow.id)}
                        className="rounded p-1.5 text-neutral-500 hover:bg-neutral-800 hover:text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="max-w-lg space-y-3 rounded-lg border border-neutral-800 bg-neutral-900/40 p-4">
              <h3 className="text-sm font-medium text-neutral-200">New Workflow</h3>
              <form onSubmit={handleCreateWorkflow} className="space-y-3">
                <div className="space-y-1.5">
                  <label htmlFor="workflowName" className="text-xs font-medium text-neutral-400">
                    Name
                  </label>
                  <input
                    id="workflowName"
                    type="text"
                    value={workflowName}
                    onChange={(e) => setWorkflowName(e.target.value)}
                    placeholder="e.g. Auto-summarize on save"
                    className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                  />
                </div>

                <div className="flex gap-3">
                  <div className="flex-1 space-y-1.5">
                    <label className="text-xs font-medium text-neutral-400">Trigger</label>
                    <Select
                      value={workflowTrigger}
                      onChange={(value) => {
                        const t = value as WorkflowTrigger
                        setWorkflowTrigger(t)
                      }}
                      options={TRIGGER_OPTIONS.map((t) => ({ value: t.value, label: t.label }))}
                      size="md"
                    />
                  </div>

                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-400">Output Action</label>
                  <Select
                    value={workflowOutputMode}
                    onChange={(value) => setWorkflowOutputMode(value as WorkflowOutputMode)}
                    options={(Object.entries(WORKFLOW_OUTPUT_MODE_LABELS) as [WorkflowOutputMode, string][]).map(
                      ([value, label]) => ({ value, label })
                    )}
                    size="md"
                  />
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-neutral-400">Actions</label>
                    {/* Ordered list of chained actions */}
                    {workflowActions.length > 0 && (
                      <div className="mb-2 space-y-1">
                        {workflowActions.map((actionId, i) => (
                          <div
                            key={`${actionId}-${i}`}
                            className="flex items-center gap-1 rounded-md border border-neutral-700 bg-neutral-800/60 px-2 py-1"
                          >
                            <span className="flex-1 truncate text-xs text-neutral-300">
                              {i + 1}. {WORKFLOW_ACTIONS.find((a) => a.id === actionId)?.label ?? actionId}
                            </span>
                            <button
                              type="button"
                              disabled={i === 0}
                              onClick={() => handleMoveWorkflowAction(i, -1)}
                              className="p-0.5 text-neutral-500 hover:text-neutral-300 disabled:opacity-30"
                              title="Move up"
                            >↑</button>
                            <button
                              type="button"
                              disabled={i === workflowActions.length - 1}
                              onClick={() => handleMoveWorkflowAction(i, 1)}
                              className="p-0.5 text-neutral-500 hover:text-neutral-300 disabled:opacity-30"
                              title="Move down"
                            >↓</button>
                            <button
                              type="button"
                              onClick={() => handleRemoveWorkflowAction(i)}
                              className="p-0.5 text-neutral-500 hover:text-red-400"
                              title="Remove"
                            >
                              <X size={11} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Add next action */}
                    <div className="flex gap-2">
                      <Select
                        value={nextWorkflowAction}
                        onChange={setNextWorkflowAction}
                        options={WORKFLOW_ACTIONS.map((a) => ({ value: a.id, label: a.label }))}
                        size="md"
                        className="flex-1"
                      />
                      <button
                        type="button"
                        onClick={handleAddWorkflowAction}
                        className="rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:border-neutral-600 hover:text-neutral-100"
                      >
                        + Add
                      </button>
                    </div>
                  </div>

                {workflowTrigger === 'shortcut' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-neutral-400">Shortcut</label>
                    {recordingWorkflowShortcut ? (
                      <input
                        autoFocus
                        placeholder="Press shortcut keys…"
                        onKeyDown={handleRecordWorkflowShortcutKeyDown}
                        onBlur={() => setRecordingWorkflowShortcut(false)}
                        className="w-full rounded-md border border-amber-500 bg-neutral-950 px-3 py-2 text-center text-xs text-amber-400 placeholder:text-amber-500/70 focus:outline-none"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setRecordingWorkflowShortcut(true)}
                        className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-center text-xs text-neutral-300 hover:border-neutral-600"
                      >
                        {workflowShortcut || 'Click to record shortcut'}
                      </button>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    !workflowName.trim() ||
                    (workflowTrigger === 'shortcut' && !workflowShortcut) ||
                    workflowActions.length === 0
                  }
                  className="w-full rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-neutral-950 transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Create Workflow
                </button>
              </form>
            </section>
          </div>
        )}
        {activeTab === 'mcp' && (
          <MCPView />
        )}
        {activeTab === 'cloud' && (
          <CloudSyncView />
        )}
        </div>
      </main>
    </div>
  )
}

export default SettingsView
