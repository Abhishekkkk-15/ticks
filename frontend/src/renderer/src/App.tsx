import { useState } from 'react'
import AppShell from './components/layout/AppShell'
import DrawingView from './features/drawings/DrawingView'
import NoteEditor from './features/notes/NoteEditor'
import type { Note } from './features/notes/types'

type MainView = 'notes' | 'whiteboard'

interface OpenNote {
  workspaceId: string
  note: Note
}

// Temporary top-level switcher for demoing notes and the whiteboard in
// isolation. Replaced by the real per-note tab system once tabs exist
// (Milestone 11).
function App(): React.JSX.Element {
  const [openNote, setOpenNote] = useState<OpenNote | null>(null)
  const [view, setView] = useState<MainView>('notes')

  return (
    <AppShell
      selectedNoteId={openNote?.note.id}
      onOpenNote={(workspaceId, note) => setOpenNote({ workspaceId, note })}
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
        </div>
        <div className="min-h-0 flex-1">
          {view === 'notes' ? (
            openNote ? (
              <NoteEditor
                workspaceId={openNote.workspaceId}
                noteId={openNote.note.id}
                onDeleted={() => setOpenNote(null)}
                onDuplicated={(note) => setOpenNote({ workspaceId: openNote.workspaceId, note })}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-neutral-500">
                Select or create a note to get started
              </div>
            )
          ) : (
            <DrawingView />
          )}
        </div>
      </div>
    </AppShell>
  )
}

export default App
