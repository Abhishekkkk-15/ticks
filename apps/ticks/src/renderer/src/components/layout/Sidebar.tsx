import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Search } from 'lucide-react'
import WorkspaceList from '../../features/workspaces/WorkspaceList'
import NoteList from '../../features/notes/NoteList'
import type { UseWorkspacesResult } from '../../features/workspaces/useWorkspaces'
import type { Workspace } from '../../features/workspaces/types'
import type { Note } from '../../features/notes/types'
import { useSettings } from '../../features/settings/SettingsContext'

interface SidebarProps {
  selectedNoteId?: string
  onOpenNote: (workspaceId: string, note: Note) => void
  workspacesApi: UseWorkspacesResult
  selectedWorkspace: Workspace | null
  onSelectWorkspace: (workspace: Workspace | null) => void
  onToggleSidebar: () => void
  onOpenCommandPalette: () => void
}

function Sidebar({
  selectedNoteId,
  onOpenNote,
  workspacesApi,
  selectedWorkspace,
  onSelectWorkspace,
  onToggleSidebar,
  onOpenCommandPalette
}: SidebarProps): React.JSX.Element {
  const { settings } = useSettings()
  const shortcutStr = settings?.keyboard_shortcuts?.command_palette || 'Ctrl+P'
  
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
      <div className="border-t border-neutral-800 p-3">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="flex w-full items-center gap-2 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 transition-colors group"
        >
          <Search size={14} className="text-neutral-500 group-hover:text-neutral-300 transition-colors" />
          <span>Search or jump...</span>
          <span className="ml-auto rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500">
            {shortcutStr.replace('Shift+', '⇧')}
          </span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
