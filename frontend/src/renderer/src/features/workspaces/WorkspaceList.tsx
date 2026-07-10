import { useState } from 'react'
import { X } from 'lucide-react'
import type { UseWorkspacesResult } from './useWorkspaces'
import type { Workspace } from './types'

interface WorkspaceListProps {
  workspacesApi: UseWorkspacesResult
  onSelect: (workspace: Workspace) => void
}

function WorkspaceList({ workspacesApi, onSelect }: WorkspaceListProps): React.JSX.Element {
  const { workspaces, loading, error, create, remove } = workspacesApi
  const [newName, setNewName] = useState('')

  async function handleCreate(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    const name = newName.trim()
    if (!name) return
    setNewName('')
    await create(name)
  }

  return (
    <div className="flex flex-1 flex-col overflow-auto px-2 py-2">
      {loading ? (
        <div className="px-2 py-4 text-center text-sm text-neutral-500">Loading…</div>
      ) : workspaces.length === 0 ? (
        <div className="px-2 py-4 text-center text-sm text-neutral-500">No workspaces yet</div>
      ) : (
        <ul className="space-y-0.5">
          {workspaces.map((workspace) => (
            <li
              key={workspace.id}
              className="group flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800"
            >
              <button
                type="button"
                onClick={() => onSelect(workspace)}
                className="min-w-0 flex-1 truncate text-left"
              >
                {workspace.name}
              </button>
              <button
                type="button"
                onClick={() => remove(workspace.id)}
                className="hidden rounded p-0.5 text-neutral-500 hover:bg-neutral-700 hover:text-red-400 group-hover:inline"
                aria-label={`Delete ${workspace.name}`}
              >
                <X size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleCreate} className="mt-2 px-1">
        <input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="New workspace…"
          className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
        />
      </form>

      {error && <div className="mt-2 px-1 text-xs text-red-400">{error}</div>}
    </div>
  )
}

export default WorkspaceList
