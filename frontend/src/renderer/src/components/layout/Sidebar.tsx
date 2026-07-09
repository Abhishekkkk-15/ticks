import WorkspaceList from '../../features/workspaces/WorkspaceList'
import { useBackendStatus } from '../../lib/useBackendStatus'

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

function Sidebar(): React.JSX.Element {
  const status = useBackendStatus()

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-neutral-800 bg-neutral-900">
      <div className="px-4 py-4 text-sm font-medium text-neutral-200">AI Learning Workspace</div>
      <WorkspaceList />
      <div className="flex items-center gap-2 border-t border-neutral-800 px-4 py-3 text-xs text-neutral-400">
        <span className={`h-2 w-2 rounded-full ${statusStyles[status]}`} />
        {statusLabels[status]}
      </div>
    </aside>
  )
}

export default Sidebar
