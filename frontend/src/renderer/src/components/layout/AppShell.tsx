import Sidebar from './Sidebar'
import type { UseWorkspacesResult } from '../../features/workspaces/useWorkspaces'
import type { Workspace } from '../../features/workspaces/types'
import type { Note } from '../../features/notes/types'

interface AppShellProps {
  children: React.ReactNode
  selectedNoteId?: string
  onOpenNote: (workspaceId: string, note: Note) => void
  workspacesApi: UseWorkspacesResult
  selectedWorkspace: Workspace | null
  onSelectWorkspace: (workspace: Workspace | null) => void
}

function AppShell({
  children,
  selectedNoteId,
  onOpenNote,
  workspacesApi,
  selectedWorkspace,
  onSelectWorkspace
}: AppShellProps): React.JSX.Element {
  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100 overflow-hidden">
      <Sidebar
        selectedNoteId={selectedNoteId}
        onOpenNote={onOpenNote}
        workspacesApi={workspacesApi}
        selectedWorkspace={selectedWorkspace}
        onSelectWorkspace={onSelectWorkspace}
      />
      <main className="flex-1 overflow-hidden p-2.5 flex flex-col min-w-0 bg-neutral-950">
        <div className="flex-1 rounded-xl border border-neutral-800/70 bg-neutral-900 shadow-2xl overflow-hidden flex flex-col">
          {children}
        </div>
      </main>
    </div>
  )
}

export default AppShell
