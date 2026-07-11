import { useCallback, useEffect, useRef, useState } from 'react'
import { Settings as SettingsIcon, X } from 'lucide-react'
import AppShell from './components/layout/AppShell'
import TitleBar from './components/layout/TitleBar'
import DrawingView from './features/drawings/DrawingView'
import NoteEditor from './features/notes/NoteEditor'
import TabBar from './features/notes/TabBar'
import type { OpenTab } from './features/notes/TabBar'
import type { Note, NoteDetail } from './features/notes/types'
import type { SaveStatus } from './features/notes/useNoteEditor'
import { useWorkspaces } from './features/workspaces/useWorkspaces'
import type { Workspace } from './features/workspaces/types'
import CommandPalette from './features/command-palette/CommandPalette'
import SettingsView from './features/settings/SettingsView'

import { useSettings } from './features/settings/SettingsContext'
import { matchShortcut } from './lib/shortcuts'
import { createNote } from './features/notes/api'
import { EmptyState } from './components/layout/EmptyState'
import { motion, AnimatePresence } from 'framer-motion'
import { useIsMaximized } from './lib/useIsMaximized'
import { streamAiAction } from './features/ai/api'
import type { AiAction } from './features/ai/api'

const QUICK_CAPTURE_ACTIONS: { id: AiAction; label: string }[] = [
  { id: 'summarize', label: 'Summarize' },
  { id: 'explain', label: 'Explain' },
  { id: 'key-points', label: 'Key Points' }
]

type MainView = 'notes' | 'whiteboard' | 'settings'

function App(): React.JSX.Element {
  const workspacesApi = useWorkspaces()
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null)
  const [tabs, setTabs] = useState<OpenTab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [activeDirty, setActiveDirty] = useState(false)
  const [view, setView] = useState<MainView>('notes')
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [captureNotification, setCaptureNotification] = useState<string | null>(null)
  const [captureTargetNote, setCaptureTargetNote] = useState<{
    workspaceId: string
    noteId: string
  } | null>(null)
  const [captureRunningAction, setCaptureRunningAction] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const { settings } = useSettings()

  // Only auto-select the default workspace once on startup — without this
  // guard, backing out to the workspace list (selectedWorkspace -> null)
  // would immediately re-trigger this effect and snap the user right back in.
  const autoSelectedDefaultRef = useRef(false)

  useEffect(() => {
    if (
      !autoSelectedDefaultRef.current &&
      !selectedWorkspace &&
      settings?.default_workspace_id &&
      workspacesApi.workspaces.length > 0
    ) {
      const defaultWs = workspacesApi.workspaces.find((w) => w.id === settings.default_workspace_id)
      if (defaultWs) {
        autoSelectedDefaultRef.current = true
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

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    const unsubscribe = window.api.onCaptureText(async (text) => {
      setCaptureNotification(text)
      setCaptureRunningAction(null)
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        setCaptureNotification(null)
        setCaptureTargetNote(null)
      }, 7000)

      if (activeTabId) {
        const currentTab = tabs.find((t) => t.note.id === activeTabId)
        if (currentTab) {
          setCaptureTargetNote({ workspaceId: currentTab.workspaceId, noteId: activeTabId })
        }
        window.dispatchEvent(new CustomEvent('shortcut:captured', { detail: { text } }))
        return
      }

      const activeWorkspace = selectedWorkspace ?? workspacesApi.workspaces[0]
      if (!activeWorkspace) return

      try {
        const { listRecentNotes, updateNoteContent, getNote } = await import('./features/notes/api')
        const recents = await listRecentNotes(activeWorkspace.id)

        let targetNoteId = ''
        let noteDetail: NoteDetail | null = null

        if (recents.length > 0) {
          targetNoteId = recents[0].id
          noteDetail = await getNote(activeWorkspace.id, targetNoteId)
        } else {
          const { createNote: apiCreateNote } = await import('./features/notes/api')
          const newNote = await apiCreateNote(activeWorkspace.id, 'Captured Notes')
          targetNoteId = newNote.id
          noteDetail = newNote
        }

        if (!noteDetail) return

        const separator =
          noteDetail.content.endsWith('\n') || noteDetail.content === '' ? '' : '\n\n'
        const updatedContent = noteDetail.content + separator + `> ${text}\n`

        await updateNoteContent(activeWorkspace.id, targetNoteId, updatedContent)

        // Propagate content update inside detail
        noteDetail.content = updatedContent

        setCaptureTargetNote({ workspaceId: activeWorkspace.id, noteId: targetNoteId })
        openNote(activeWorkspace.id, noteDetail)
      } catch (err) {
        console.error('Failed to append global capture to recent note:', err)
      }
    })

    return () => {
      unsubscribe()
      clearTimeout(timeoutId)
    }
  }, [selectedWorkspace, activeTabId, tabs, workspacesApi.workspaces, openNote])

  const runQuickCaptureAction = useCallback(
    async (action: AiAction) => {
      if (!captureNotification || !captureTargetNote || captureRunningAction) return
      setCaptureRunningAction(action)
      try {
        let resultText = ''
        await streamAiAction(
          action,
          captureNotification,
          (chunk) => (resultText += chunk),
          undefined,
          {
            workspaceId: captureTargetNote.workspaceId,
            noteId: captureTargetNote.noteId
          }
        )
        const { getNote, updateNoteContent } = await import('./features/notes/api')
        const detail = await getNote(captureTargetNote.workspaceId, captureTargetNote.noteId)
        const label = QUICK_CAPTURE_ACTIONS.find((a) => a.id === action)?.label ?? action
        const separator = detail.content.endsWith('\n') || detail.content === '' ? '' : '\n\n'
        const updated = `${detail.content}${separator}**${label}:**\n${resultText}\n`
        await updateNoteContent(captureTargetNote.workspaceId, captureTargetNote.noteId, updated)
        // If this note is currently open, its editor's own local state
        // wouldn't otherwise pick up a change saved through this direct API
        // call — sync it the same way the raw-capture path already does.
        window.dispatchEvent(
          new CustomEvent('note:content-updated', {
            detail: { noteId: captureTargetNote.noteId, content: updated }
          })
        )
        setCaptureNotification(null)
        setCaptureTargetNote(null)
      } catch (err) {
        console.error('Quick capture AI action failed:', err)
      } finally {
        setCaptureRunningAction(null)
      }
    },
    [captureNotification, captureTargetNote, captureRunningAction]
  )

  const handleCreateNote = useCallback(async () => {
    if (!selectedWorkspace) return
    const note = await createNote(selectedWorkspace.id, 'Untitled')
    openNote(selectedWorkspace.id, note)
  }, [selectedWorkspace, openNote])

  const handleCreateWorkspace = useCallback(async () => {
    const name = window.prompt('Enter workspace name:')
    if (name?.trim()) {
      await workspacesApi.create(name.trim())
    }
  }, [workspacesApi])

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

  // Mirrors the active note's identity into the main process so the
  // mini-tray window (a separate renderer/BrowserWindow) knows which note
  // to load without needing its own copy of this app's full tab state.
  useEffect(() => {
    window.api.notifyActiveNote(
      activeTab ? { workspaceId: activeTab.workspaceId, noteId: activeTab.note.id } : null
    )
  }, [activeTab])

  // More discrete shortcuts for actions that were previously click-only.
  // Hardcoded (not settings-driven) — same precedent as Ctrl+E and the
  // CodeMirror keymap. `Ctrl+Shift+W` (not bare Ctrl+W) deliberately dodges
  // Electron's default-menu window-close accelerator.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (matchShortcut(event, 'Ctrl+N')) {
        event.preventDefault()
        handleCreateNote()
        return
      }
      if (matchShortcut(event, 'Ctrl+Shift+W')) {
        if (activeTabId) {
          event.preventDefault()
          closeTab(activeTabId)
        }
        return
      }
      if (matchShortcut(event, 'Ctrl+Tab') || matchShortcut(event, 'Ctrl+Shift+Tab')) {
        if (tabs.length > 1) {
          event.preventDefault()
          const index = tabs.findIndex((t) => t.note.id === activeTabId)
          const delta = event.shiftKey ? -1 : 1
          const next = tabs[(index + delta + tabs.length) % tabs.length]
          setActiveTabId(next.note.id)
        }
        return
      }
      if (matchShortcut(event, 'Ctrl+\\')) {
        event.preventDefault()
        setSidebarCollapsed((collapsed) => !collapsed)
        return
      }
      if (matchShortcut(event, 'Ctrl+Shift+F')) {
        event.preventDefault()
        window.dispatchEvent(new CustomEvent('sidebar:focus-search'))
        return
      }
      if (matchShortcut(event, 'Ctrl+,')) {
        event.preventDefault()
        setView('settings')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTabId, tabs, closeTab, handleCreateNote])

  // Frameless windows (Windows/Linux) are rendered with a transparent
  // BrowserWindow so these CSS corners actually show through to the desktop;
  // squared off again once maximized, since a rounded shape flush against
  // the screen edges just looks like a rendering glitch.
  const isMaximized = useIsMaximized()
  const isMac = window.api.platform === 'darwin'
  const rounded = !isMac && !isMaximized

  return (
    <div
      className={`flex h-screen flex-col ${rounded ? 'overflow-hidden rounded-lg shadow-2xl' : ''}`}
    >
      <TitleBar />
      <div className="min-h-0 flex-1">
        <AppShell
          selectedNoteId={activeTabId ?? undefined}
          onOpenNote={openNote}
          workspacesApi={workspacesApi}
          selectedWorkspace={selectedWorkspace}
          onSelectWorkspace={setSelectedWorkspace}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
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
                <DrawingView
                  workspaceId={selectedWorkspace?.id ?? activeTab?.workspaceId ?? null}
                />
              ) : activeTab ? (
                <NoteEditor
                  key={activeTab.note.id}
                  workspaceId={activeTab.workspaceId}
                  noteId={activeTab.note.id}
                  onDeleted={() => closeTab(activeTab.note.id)}
                  onDuplicated={(note) => openNote(activeTab.workspaceId, note)}
                  onRenamed={renameTab}
                  onSaveStatusChange={(status: SaveStatus) =>
                    setActiveDirty(status === 'saving' || status === 'unsaved')
                  }
                />
              ) : (
                <EmptyState
                  selectedWorkspaceName={selectedWorkspace?.name ?? null}
                  onOpenCommandPalette={() => setPaletteOpen(true)}
                  onNewNote={handleCreateNote}
                  onNewWorkspace={handleCreateWorkspace}
                  onOpenWhiteboard={() => setView('whiteboard')}
                />
              )}
            </div>
          </div>

          <AnimatePresence>
            {paletteOpen && (
              <CommandPalette
                workspacesApi={workspacesApi}
                activeWorkspaceId={selectedWorkspace?.id ?? activeTab?.workspaceId ?? null}
                onSelectWorkspace={setSelectedWorkspace}
                onOpenNote={openNote}
                onOpenSettings={(tab) => {
                  setView('settings')
                  if (tab)
                    window.dispatchEvent(new CustomEvent('settings:navigate', { detail: { tab } }))
                }}
                onClose={() => setPaletteOpen(false)}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {captureNotification && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.95 }}
                className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900/95 px-4 py-3 shadow-2xl backdrop-blur-md"
              >
                <span className="text-xs text-neutral-300">Text captured to note!</span>
                {captureRunningAction ? (
                  <span className="text-[10px] text-neutral-500">
                    Generating{' '}
                    {QUICK_CAPTURE_ACTIONS.find((a) => a.id === captureRunningAction)?.label}…
                  </span>
                ) : (
                  <>
                    {QUICK_CAPTURE_ACTIONS.map((action) => (
                      <button
                        key={action.id}
                        type="button"
                        disabled={!captureTargetNote}
                        onClick={() => runQuickCaptureAction(action.id)}
                        className="rounded bg-neutral-800 hover:bg-neutral-700 px-2 py-1 text-[10px] font-medium text-neutral-200 transition-colors disabled:opacity-40"
                      >
                        {action.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const text = captureNotification
                        setCaptureNotification(null)
                        setView('notes')
                        window.dispatchEvent(
                          new CustomEvent('editor:open-ai', { detail: { text } })
                        )
                      }}
                      className="rounded bg-amber-500 hover:bg-amber-600 px-2 py-1 text-[10px] font-medium text-neutral-950 transition-colors"
                    >
                      Enhance with AI
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setCaptureNotification(null)}
                  className="text-neutral-500 hover:text-neutral-300 transition-colors p-0.5 rounded hover:bg-neutral-800"
                >
                  <X size={12} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </AppShell>
      </div>
    </div>
  )
}

export default App
