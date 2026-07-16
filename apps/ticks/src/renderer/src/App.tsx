import { useCallback, useEffect, useRef, useState } from 'react'
import { Settings as SettingsIcon, X, Maximize, Columns } from 'lucide-react'
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
import { runWorkflows } from './features/workflows/runWorkflows'
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
import { useBackendStatus } from './lib/useBackendStatus'

const QUICK_CAPTURE_ACTIONS: { id: AiAction; label: string }[] = [
  { id: 'summarize', label: 'Summarize' },
  { id: 'explain', label: 'Explain' },
  { id: 'key-points', label: 'Key Points' }
]

type MainView = 'notes' | 'whiteboard' | 'settings'

function App(): React.JSX.Element {
  const backendStatus = useBackendStatus()
  const [showTroubleshoot, setShowTroubleshoot] = useState(false)

  useEffect(() => {
    if (backendStatus === 'offline') {
      const timer = setTimeout(() => setShowTroubleshoot(true), 6000)
      return () => clearTimeout(timer)
    } else {
      setShowTroubleshoot(false)
    }
    return undefined
  }, [backendStatus])

  const workspacesApi = useWorkspaces()
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null)
  const [tabs, setTabs] = useState<OpenTab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [dirtyTabs, setDirtyTabs] = useState<Record<string, boolean>>({})
  const [closingTabId, setClosingTabId] = useState<string | null>(null)
  const [view, setView] = useState<MainView>('notes')
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [captureNotification, setCaptureNotification] = useState<string | null>(null)
  const [captureTargetNote, setCaptureTargetNote] = useState<{
    workspaceId: string
    noteId: string
  } | null>(null)
  const [captureRunningAction, setCaptureRunningAction] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [splitMode, setSplitMode] = useState(false)
  const [splitTabId, setSplitTabId] = useState<string | null>(null)

  const { settings } = useSettings()

  // Load initial state from localStorage
  const stateLoadedRef = useRef(false)
  
  useEffect(() => {
    if (stateLoadedRef.current || workspacesApi.workspaces.length === 0) return
    stateLoadedRef.current = true

    const loadState = async () => {
      try {
        const savedStateStr = localStorage.getItem('ticks:app-state')
        if (!savedStateStr) return
        
        const savedState = JSON.parse(savedStateStr)
        if (savedState.workspaceId) {
          const ws = workspacesApi.workspaces.find((w) => w.id === savedState.workspaceId)
          if (ws) setSelectedWorkspace(ws)
        }
        
        if (savedState.tabs && Array.isArray(savedState.tabs)) {
          const { getNote } = await import('./features/notes/api')
          const loadedTabs: OpenTab[] = []
          for (const t of savedState.tabs) {
             try {
               const note = await getNote(t.workspaceId, t.noteId)
               loadedTabs.push({ workspaceId: t.workspaceId, note })
             } catch (e) {
               // Note might be deleted
             }
          }
          if (loadedTabs.length > 0) {
            setTabs(loadedTabs)
            if (savedState.activeTabId && loadedTabs.some(t => t.note.id === savedState.activeTabId)) {
              setActiveTabId(savedState.activeTabId)
            } else {
              setActiveTabId(loadedTabs[0].note.id)
            }
          }
        }
      } catch (e) {
        console.error('Failed to load app state:', e)
      }
    }
    loadState()
  }, [workspacesApi.workspaces])

  useEffect(() => {
    if (!stateLoadedRef.current) return
    const state = {
      workspaceId: selectedWorkspace?.id || null,
      tabs: tabs.map(t => ({ workspaceId: t.workspaceId, noteId: t.note.id })),
      activeTabId
    }
    localStorage.setItem('ticks:app-state', JSON.stringify(state))
  }, [selectedWorkspace, tabs, activeTabId])

  // Dropbox Background Auto-Sync
  useEffect(() => {
    if (!settings?.dropbox_connected || !settings?.dropbox_auto_sync) return
    const interval = setInterval(() => {
      import('./lib/api').then(({ apiFetch }) => {
        apiFetch('/api/sync/dropbox/trigger', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'smart' })
        }).catch((err) => {
          console.error('[Dropbox Auto-Sync] failed:', err)
        })
      })
    }, 5 * 60 * 1000) // 5 minutes
    return () => clearInterval(interval)
  }, [settings?.dropbox_connected, settings?.dropbox_auto_sync])

  const openNote = useCallback((workspaceId: string, note: Note) => {
    setTabs((prev) => {
      const exists = prev.some((t) => t.note.id === note.id)
      if (exists) {
        // Update the note data in case it changed (e.g. title or background content changes)
        return prev.map((t) => (t.note.id === note.id ? { ...t, note: { ...t.note, ...note } } : t))
      }
      return [...prev, { workspaceId, note }]
    })
    setActiveTabId(note.id)
    setView('notes')
  }, [])

  useEffect(() => {
    async function handleOpenNoteEvent(event: Event): Promise<void> {
      const customEvent = event as CustomEvent<{ workspaceId: string; noteId: string }>
      const { workspaceId, noteId } = customEvent.detail
      const { getNote } = await import('./features/notes/api')
      try {
        const noteDetail = await getNote(workspaceId, noteId)
        openNote(workspaceId, noteDetail)
      } catch (e) {
        console.error(e)
      }
    }
    
    function handleContentUpdated(event: Event): void {
      const customEvent = event as CustomEvent<{ noteId: string; content: string }>
      setTabs((prev) =>
        prev.map((tab) =>
          tab.note.id === customEvent.detail.noteId
            ? { ...tab, note: { ...tab.note, content: customEvent.detail.content } }
            : tab
        )
      )
    }

    window.addEventListener('note:open', handleOpenNoteEvent)
    window.addEventListener('note:content-updated', handleContentUpdated)
    return () => {
      window.removeEventListener('note:open', handleOpenNoteEvent)
      window.removeEventListener('note:content-updated', handleContentUpdated)
    }
  }, [openNote])

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
        
        const workflows = settings?.workflows ?? []
        if (workflows.some((w) => w.trigger === 'on_capture')) {
          runWorkflows('on_capture', workflows, {
            workspaceId: activeWorkspace.id,
            noteId: targetNoteId,
            content: updatedContent,
            clipboardText: text
          }).catch(() => {})
        }
      } catch (err) {
        console.error('Failed to append global capture to recent note:', err)
      }
    })

    return () => {
      unsubscribe()
      clearTimeout(timeoutId)
    }
  }, [selectedWorkspace, activeTabId, tabs, workspacesApi.workspaces, openNote, settings])

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

  const handleSaveStatusChange = useCallback((noteId: string, status: SaveStatus) => {
    setDirtyTabs(prev => {
      const isDirty = status === 'saving' || status === 'unsaved'
      if (prev[noteId] === isDirty) return prev
      return { ...prev, [noteId]: isDirty }
    })
  }, [])

  const forceCloseTab = useCallback(
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
      setSplitTabId(prev => prev === noteId ? null : prev)
      setDirtyTabs(prev => {
        if (!prev[noteId]) return prev
        const next = { ...prev }
        delete next[noteId]
        return next
      })
    },
    [activeTabId]
  )

  const closeTab = useCallback(
    (noteId: string) => {
      if (dirtyTabs[noteId]) {
        setClosingTabId(noteId)
      } else {
        forceCloseTab(noteId)
      }
    },
    [dirtyTabs, forceCloseTab]
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
      if (matchShortcut(event, 'F11')) {
        event.preventDefault()
        setFocusMode((m) => !m)
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
      className={`flex h-screen flex-col ${rounded ? 'overflow-hidden rounded-lg shadow-2xl' : ''} ${focusMode ? 'focus-mode' : ''}`}
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
          onOpenCommandPalette={() => setPaletteOpen(true)}
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
              <div className="ml-auto flex items-center gap-1">
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
                <button
                  type="button"
                  onClick={() => setSplitMode(!splitMode)}
                  title="Toggle Split View"
                  aria-pressed={splitMode}
                  className={`rounded-md p-1.5 ${
                    splitMode
                      ? 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30'
                      : 'text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300'
                  }`}
                >
                  <Columns size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setFocusMode(!focusMode)}
                  title="Toggle Focus Mode (F11)"
                  aria-pressed={focusMode}
                  className={`rounded-md p-1.5 ${
                    focusMode
                      ? 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30'
                      : 'text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300'
                  }`}
                >
                  <Maximize size={14} />
                </button>
              </div>
            </div>
            {view === 'notes' && (
              <div className="shrink-0 hide-in-focus">
                <TabBar
                  tabs={tabs}
                  activeId={activeTabId}
                  activeDirty={activeTabId ? (dirtyTabs[activeTabId] || false) : false}
                  onSelect={setActiveTabId}
                  onClose={closeTab}
                  onReorder={reorderTabs}
                />
              </div>
            )}
            <div className="min-h-0 flex-1">
              {view === 'settings' ? (
                <SettingsView />
              ) : view === 'whiteboard' ? (
                <DrawingView
                  workspaceId={selectedWorkspace?.id ?? activeTab?.workspaceId ?? null}
                />
              ) : activeTab ? (
                <div className="flex h-full w-full">
                  <div className={`flex-1 min-w-0 ${splitMode ? 'border-r border-neutral-800' : ''}`}>
                    <NoteEditor
                      key={activeTab.note.id}
                      workspaceId={activeTab.workspaceId}
                      noteId={activeTab.note.id}
                      onDeleted={() => closeTab(activeTab.note.id)}
                      onDuplicated={(note) => openNote(activeTab.workspaceId, note)}
                      onRenamed={renameTab}
                      onSaveStatusChange={(status: SaveStatus) => handleSaveStatusChange(activeTab.note.id, status)}
                    />
                  </div>
                  {splitMode && (
                    <div 
                      className="flex-1 min-w-0 flex flex-col"
                      onDragOver={(e) => {
                        if (e.dataTransfer.types.includes('application/x-ticks-tab') || e.dataTransfer.types.includes('text/plain')) {
                          e.preventDefault()
                          e.dataTransfer.dropEffect = 'copy'
                        }
                      }}
                      onDrop={async (e) => {
                        e.preventDefault()
                        const tabNoteId = e.dataTransfer.getData('application/x-ticks-tab')
                        if (tabNoteId && tabs.some(t => t.note.id === tabNoteId)) {
                           setSplitTabId(tabNoteId)
                           return
                        }
                        
                        const plainNoteId = e.dataTransfer.getData('text/plain')
                        if (plainNoteId && selectedWorkspace) {
                           const { getNote } = await import('./features/notes/api')
                           try {
                             const noteDetail = await getNote(selectedWorkspace.id, plainNoteId)
                             openNote(selectedWorkspace.id, noteDetail)
                             setSplitTabId(noteDetail.id)
                           } catch (err) {
                             console.error('Failed to open dropped note:', err)
                           }
                        }
                      }}
                    >
                      {splitTabId ? (
                        <>
                          <div className="border-b border-neutral-800 bg-neutral-900/50 px-3 py-1.5 text-xs flex items-center justify-between shrink-0">
                            <span className="text-neutral-400 font-medium">
                              {tabs.find(t => t.note.id === splitTabId)?.note.title || 'Split View'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setSplitTabId(null)}
                              className="text-neutral-500 hover:text-neutral-300 transition-colors p-0.5 rounded hover:bg-neutral-800"
                              title="Close split view"
                            >
                              <X size={12} />
                            </button>
                          </div>
                          <div className="flex-1 min-h-0">
                            <NoteEditor
                              key={`split-${splitTabId}`}
                              workspaceId={tabs.find(t => t.note.id === splitTabId)?.workspaceId || activeTab.workspaceId}
                              noteId={splitTabId}
                              onDeleted={() => setSplitTabId(null)}
                              onDuplicated={(note) => openNote(activeTab.workspaceId, note)}
                              onRenamed={renameTab}
                              onSaveStatusChange={(status: SaveStatus) => handleSaveStatusChange(splitTabId, status)}
                            />
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 m-4 rounded-xl border-2 border-dashed border-neutral-800 bg-neutral-900/30 flex items-center justify-center text-sm text-neutral-500 pointer-events-none">
                          Drag a note here to view side-by-side
                        </div>
                      )}
                    </div>
                  )}
                </div>
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

      <AnimatePresence>
        {backendStatus !== 'connected' && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-neutral-950 select-none"
          >
            {/* Logo / Animation container */}
            <div className="relative mb-10 flex h-32 w-32 items-center justify-center">
              {/* Soft breathing background glow */}
              <motion.div
                animate={{ scale: [1, 1.25, 1], opacity: [0.15, 0.35, 0.15] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-full bg-amber-500/10 blur-2xl"
              />

              {/* Pulsing outer ring */}
              <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-2 rounded-full border border-neutral-800"
              />

              {/* Rotating outer dash ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 rounded-full border border-dashed border-neutral-800/60"
              />

              {/* Symmetrical cozy notepad SVG */}
              <svg
                width="56"
                height="56"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="relative z-10 text-neutral-300 filter drop-shadow-[0_0_8px_rgba(245,158,11,0.2)]"
              >
                {/* Page outline */}
                <motion.path
                  d="M16 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L16 3z"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.6, ease: 'easeInOut' }}
                />
                {/* Dog-ear fold */}
                <motion.path
                  d="M15 3v5h5"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8, delay: 0.6, ease: 'easeInOut' }}
                />
                {/* Cozy horizontal writing lines */}
                <motion.line
                  x1="8"
                  y1="12"
                  x2="16"
                  y2="12"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6, delay: 1.1, ease: 'easeInOut' }}
                />
                <motion.line
                  x1="8"
                  y1="16"
                  x2="15"
                  y2="16"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6, delay: 1.4, ease: 'easeInOut' }}
                />
              </svg>
            </div>

            {/* Application Title */}
            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 0.2, ease: 'easeOut' }}
              className="text-3xl font-light tracking-[0.3em] text-neutral-200 uppercase font-sans mb-3"
            >
              Ticks
            </motion.h1>

            {/* Subtitle / Loading State */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-col items-center gap-1.5"
            >
              <div className="flex items-center gap-2">
                {/* Small infinite spinner */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  className="h-3 w-3 rounded-full border border-neutral-700 border-t-amber-500"
                />
                <span className="text-xs font-light tracking-wide text-neutral-400">
                  {backendStatus === 'connecting'
                    ? 'Loading backend service...'
                    : 'Establishing secure API connection...'}
                </span>
              </div>

              {/* Troubleshooting helper */}
              {showTroubleshoot && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 max-w-sm text-center text-[11px] font-light leading-relaxed text-neutral-500 px-4"
                >
                  The database or API server is taking longer than usual to boot. 
                  This can happen during first-time initialization or file lock checks.
                </motion.p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {closingTabId && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl"
            >
              <h3 className="mb-2 text-lg font-semibold text-neutral-100">Unsaved Changes</h3>
              <p className="mb-6 text-sm text-neutral-400">
                You have unsaved changes in this note. Do you want to save them before closing?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setClosingTabId(null)}
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('editor:discard-save', { detail: { noteId: closingTabId } }))
                    forceCloseTab(closingTabId)
                    setClosingTabId(null)
                  }}
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('editor:force-save', { detail: { noteId: closingTabId } }))
                    forceCloseTab(closingTabId)
                    setClosingTabId(null)
                  }}
                  className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-semibold text-neutral-950 hover:bg-amber-600 transition-colors"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default App
