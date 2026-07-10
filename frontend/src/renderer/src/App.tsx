import { useCallback, useEffect, useState } from 'react'
import { Settings as SettingsIcon } from 'lucide-react'
import AppShell from './components/layout/AppShell'
import DrawingView from './features/drawings/DrawingView'
import NoteEditor from './features/notes/NoteEditor'
import TabBar from './features/notes/TabBar'
import type { OpenTab } from './features/notes/TabBar'
import type { Note } from './features/notes/types'
import type { SaveStatus } from './features/notes/useNoteEditor'
import { useWorkspaces } from './features/workspaces/useWorkspaces'
import type { Workspace } from './features/workspaces/types'
import CommandPalette from './features/command-palette/CommandPalette'
import SettingsView from './features/settings/SettingsView'

import { useSettings } from './features/settings/SettingsContext'
import { matchShortcut } from './lib/shortcuts'

type MainView = 'notes' | 'whiteboard' | 'settings'

function App(): React.JSX.Element {
  const workspacesApi = useWorkspaces()
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null)
  const [tabs, setTabs] = useState<OpenTab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [activeDirty, setActiveDirty] = useState(false)
  const [view, setView] = useState<MainView>('notes')
  const [paletteOpen, setPaletteOpen] = useState(false)

  const { settings } = useSettings()

  useEffect(() => {
    if (
      !selectedWorkspace &&
      settings?.default_workspace_id &&
      workspacesApi.workspaces.length > 0
    ) {
      const defaultWs = workspacesApi.workspaces.find((w) => w.id === settings.default_workspace_id)
      if (defaultWs) {
        Promise.resolve().then(() => {
          setSelectedWorkspace(defaultWs)
        })
      }
    }
  }, [settings?.default_workspace_id, workspacesApi.workspaces, selectedWorkspace])

  const openNote = useCallback((workspaceId: string, note: Note) => {
    setTabs((prev) =>
      prev.some((t) => t.note.id === note.id) ? prev : [...prev, { workspaceId, note }]
    )
    setActiveTabId(note.id)
    setView('notes')
  }, [])

  const closeTab = useCallback(
    (noteId: string) => {
      setTabs((prev) => {
        const index = prev.findIndex((t) => t.note.id === noteId)
        const next = prev.filter((t) => t.note.id !== noteId)
        if (activeTabId === noteId) {
          const fallback = next[index] ?? next[index - 1]
          setActiveTabId(fallback ? fallback.note.id : null)
        }
        return next
      })
    },
    [activeTabId]
  )

  const reorderTabs = useCallback((fromIndex: number, toIndex: number) => {
    setTabs((prev) => {
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
  }, [])

  const renameTab = useCallback((note: Note) => {
    setTabs((prev) => prev.map((t) => (t.note.id === note.id ? { ...t, note } : t)))
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      const shortcutStr = settings?.keyboard_shortcuts?.command_palette || 'Ctrl+Shift+P'
      if (matchShortcut(event, shortcutStr)) {
        event.preventDefault()
        setPaletteOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [settings?.keyboard_shortcuts?.command_palette])

  const activeTab = tabs.find((t) => t.note.id === activeTabId) ?? null

  return (
    <AppShell
      selectedNoteId={activeTabId ?? undefined}
      onOpenNote={openNote}
      workspacesApi={workspacesApi}
      selectedWorkspace={selectedWorkspace}
      onSelectWorkspace={setSelectedWorkspace}
    >
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center gap-1 border-b border-neutral-800 px-3 py-2">
          <button
            type="button"
            onClick={() => setView('notes')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              view === 'notes'
                ? 'bg-neutral-800 text-neutral-100'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            Notes
          </button>
          <button
            type="button"
            onClick={() => setView('whiteboard')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              view === 'whiteboard'
                ? 'bg-neutral-800 text-neutral-100'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            Whiteboard
          </button>
          <span className="ml-auto text-xs text-neutral-600">Ctrl+Shift+P for commands</span>
          <button
            type="button"
            onClick={() => setView('settings')}
            title="Settings"
            aria-pressed={view === 'settings'}
            className={`rounded-md p-1.5 ${
              view === 'settings'
                ? 'bg-neutral-800 text-neutral-100'
                : 'text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300'
            }`}
          >
            <SettingsIcon size={14} />
          </button>
        </div>
        {view === 'notes' && (
          <TabBar
            tabs={tabs}
            activeId={activeTabId}
            activeDirty={activeDirty}
            onSelect={setActiveTabId}
            onClose={closeTab}
            onReorder={reorderTabs}
          />
        )}
        <div className="min-h-0 flex-1">
          {view === 'settings' ? (
            <SettingsView />
          ) : view === 'whiteboard' ? (
            <DrawingView />
          ) : activeTab ? (
            <NoteEditor
              key={activeTab.note.id}
              workspaceId={activeTab.workspaceId}
              noteId={activeTab.note.id}
              onDeleted={() => closeTab(activeTab.note.id)}
              onDuplicated={(note) => openNote(activeTab.workspaceId, note)}
              onRenamed={renameTab}
              onSaveStatusChange={(status: SaveStatus) => setActiveDirty(status === 'saving')}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-neutral-500">
              Select or create a note to get started
            </div>
          )}
        </div>
      </div>

      {paletteOpen && (
        <CommandPalette
          workspacesApi={workspacesApi}
          activeWorkspaceId={selectedWorkspace?.id ?? activeTab?.workspaceId ?? null}
          onSelectWorkspace={setSelectedWorkspace}
          onOpenNote={openNote}
          onClose={() => setPaletteOpen(false)}
        />
      )}
    </AppShell>
  )
}

export default App
