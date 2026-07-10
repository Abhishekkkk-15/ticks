import Sidebar from './Sidebar'
import type { Note } from '../../features/notes/types'

interface AppShellProps {
  children: React.ReactNode
  selectedNoteId?: string
  onOpenNote: (workspaceId: string, note: Note) => void
}

function AppShell({ children, selectedNoteId, onOpenNote }: AppShellProps): React.JSX.Element {
  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100">
      <Sidebar selectedNoteId={selectedNoteId} onOpenNote={onOpenNote} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}

export default AppShell
