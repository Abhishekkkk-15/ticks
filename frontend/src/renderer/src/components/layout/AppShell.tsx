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
    <div className="flex h-screen bg-neutral-950 text-neutral-100">
      <Sidebar
        selectedNoteId={selectedNoteId}
        onOpenNote={onOpenNote}
        workspacesApi={workspacesApi}
        selectedWorkspace={selectedWorkspace}
        onSelectWorkspace={onSelectWorkspace}
      />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}

export default AppShell
