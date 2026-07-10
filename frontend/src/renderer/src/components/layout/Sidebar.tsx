import { useState } from 'react'
import WorkspaceList from '../../features/workspaces/WorkspaceList'
import NoteList from '../../features/notes/NoteList'
import { useBackendStatus } from '../../lib/useBackendStatus'
import type { Workspace } from '../../features/workspaces/types'
import type { Note } from '../../features/notes/types'

const statusStyles: Record<string, string> = {
  connected: 'bg-emerald-500',
  connecting: 'bg-amber-500',
  offline: 'bg-red-500'
}

const statusLabels: Record<string, string> = {
  connected: 'Backend connected',
  connecting: 'Connecting to backend…',
  offline: 'Backend offline'
}

interface SidebarProps {
  selectedNoteId?: string
  onOpenNote: (workspaceId: string, note: Note) => void
}

function Sidebar({ selectedNoteId, onOpenNote }: SidebarProps): React.JSX.Element {
  const status = useBackendStatus()
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null)

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-neutral-800 bg-neutral-900">
      <div className="px-4 py-4 text-sm font-medium text-neutral-200">AI Learning Workspace</div>
      {selectedWorkspace ? (
        <NoteList
          workspaceId={selectedWorkspace.id}
          workspaceName={selectedWorkspace.name}
          selectedNoteId={selectedNoteId}
          onBack={() => setSelectedWorkspace(null)}
          onOpenNote={(note) => onOpenNote(selectedWorkspace.id, note)}
        />
      ) : (
        <WorkspaceList onSelect={setSelectedWorkspace} />
      )}
      <div className="flex items-center gap-2 border-t border-neutral-800 px-4 py-3 text-xs text-neutral-400">
        <span className={`h-2 w-2 rounded-full ${statusStyles[status]}`} />
        {statusLabels[status]}
      </div>
    </aside>
  )
}

export default Sidebar
