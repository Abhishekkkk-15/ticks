import Sidebar from './Sidebar'
import type { UseWorkspacesResult } from '../../features/workspaces/useWorkspaces'
import type { Workspace } from '../../features/workspaces/types'
import type { Note } from '../../features/notes/types'
import { motion } from 'framer-motion'
import { Menu } from 'lucide-react'

interface AppShellProps {
  children: React.ReactNode
  selectedNoteId?: string
  onOpenNote: (workspaceId: string, note: Note) => void
  workspacesApi: UseWorkspacesResult
  selectedWorkspace: Workspace | null
  onSelectWorkspace: (workspace: Workspace | null) => void
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
}

function AppShell({
  children,
  selectedNoteId,
  onOpenNote,
  workspacesApi,
  selectedWorkspace,
  onSelectWorkspace,
  sidebarCollapsed,
  onToggleSidebar
}: AppShellProps): React.JSX.Element {
  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100 overflow-hidden relative">
      <motion.div
        animate={{ width: sidebarCollapsed ? 0 : 256 }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        className="flex shrink-0 flex-col overflow-hidden h-full"
      >
        <Sidebar
          selectedNoteId={selectedNoteId}
          onOpenNote={onOpenNote}
          workspacesApi={workspacesApi}
          selectedWorkspace={selectedWorkspace}
          onSelectWorkspace={onSelectWorkspace}
          onToggleSidebar={onToggleSidebar}
        />
      </motion.div>

      {sidebarCollapsed && (
        <button
          type="button"
          onClick={onToggleSidebar}
          className="absolute top-4 left-4 z-40 rounded-lg border border-neutral-800 bg-neutral-900/90 p-1.5 text-neutral-400 hover:text-neutral-200 shadow-xl backdrop-blur transition-all"
          title="Expand Sidebar"
        >
          <Menu size={16} />
        </button>
      )}

      <main className="flex-1 overflow-hidden p-2.5 flex flex-col min-w-0 bg-neutral-950">
        <div className="flex-1 rounded-xl border border-neutral-800/70 bg-neutral-900 shadow-2xl overflow-hidden flex flex-col">
          {children}
        </div>
      </main>
    </div>
  )
}

export default AppShell
