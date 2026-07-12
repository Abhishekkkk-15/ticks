import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft } from 'lucide-react'
import WorkspaceList from '../../features/workspaces/WorkspaceList'
import NoteList from '../../features/notes/NoteList'
import { useBackendStatus } from '../../lib/useBackendStatus'
import type { UseWorkspacesResult } from '../../features/workspaces/useWorkspaces'
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
  workspacesApi: UseWorkspacesResult
  selectedWorkspace: Workspace | null
  onSelectWorkspace: (workspace: Workspace | null) => void
  onToggleSidebar: () => void
}

function Sidebar({
  selectedNoteId,
  onOpenNote,
  workspacesApi,
  selectedWorkspace,
  onSelectWorkspace,
  onToggleSidebar
}: SidebarProps): React.JSX.Element {
  const status = useBackendStatus()

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-neutral-800/60 bg-neutral-950 h-full">
      <div className="flex items-center justify-between px-4 py-4 text-sm font-medium text-neutral-200">
        <span>Ticks</span>
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded p-1 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300 transition-colors"
          title="Collapse Sidebar"
        >
          <ChevronLeft size={16} />
        </button>
      </div>
      <div className="flex-1 flex flex-col min-h-0 relative">
        <AnimatePresence mode="wait">
          {selectedWorkspace ? (
            <motion.div
              key="notes"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              className="flex-1 flex flex-col min-h-0"
            >
              <NoteList
                workspaceId={selectedWorkspace.id}
                workspaceName={selectedWorkspace.name}
                selectedNoteId={selectedNoteId}
                onBack={() => onSelectWorkspace(null)}
                onOpenNote={(note) => onOpenNote(selectedWorkspace.id, note)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="workspaces"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="flex-1 flex flex-col min-h-0"
            >
              <WorkspaceList workspacesApi={workspacesApi} onSelect={onSelectWorkspace} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="flex items-center gap-2 border-t border-neutral-800 px-4 py-3 text-xs text-neutral-400">
        <span className={`h-2 w-2 rounded-full ${statusStyles[status]}`} />
        {statusLabels[status]}
      </div>
    </aside>
  )
}

export default Sidebar
