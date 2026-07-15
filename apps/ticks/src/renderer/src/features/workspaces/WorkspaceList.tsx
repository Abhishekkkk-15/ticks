import { useState } from 'react'
import { useRef } from 'react'
import { Pencil, X, Upload, Download } from 'lucide-react'
import { getExportWorkspaceUrl } from './api'
import type { UseWorkspacesResult } from './useWorkspaces'
import type { Workspace } from './types'

interface WorkspaceListProps {
  workspacesApi: UseWorkspacesResult
  onSelect: (workspace: Workspace) => void
}

function WorkspaceList({ workspacesApi, onSelect }: WorkspaceListProps): React.JSX.Element {
  const { workspaces, loading, error, create, remove, rename, importArchive } = workspacesApi
  const [newName, setNewName] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleExport(workspace: Workspace): Promise<void> {
    const url = await getExportWorkspaceUrl(workspace.id)
    const a = document.createElement('a')
    a.href = url
    a.download = `${workspace.id}.zip`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0]
    if (!file) return
    // Default name to file name without extension
    const name = file.name.replace(/\.zip$/i, '') || 'Imported Workspace'
    await importArchive(file, name)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  async function handleCreate(event: React.FormEvent): Promise<void> {
    event.preventDefault()
    const name = newName.trim()
    if (!name) return
    setNewName('')
    await create(name)
  }

  function startRename(workspace: Workspace): void {
    setRenamingId(workspace.id)
    setRenameDraft(workspace.name)
  }

  async function commitRename(workspace: Workspace): Promise<void> {
    setRenamingId(null)
    const name = renameDraft.trim()
    if (!name || name === workspace.name) return
    await rename(workspace.id, name)
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
              {renamingId === workspace.id ? (
                <input
                  autoFocus
                  value={renameDraft}
                  onChange={(event) => setRenameDraft(event.target.value)}
                  onBlur={() => commitRename(workspace)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') commitRename(workspace)
                    if (event.key === 'Escape') setRenamingId(null)
                  }}
                  className="min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-800 px-1.5 py-0.5 text-sm text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => onSelect(workspace)}
                  className="min-w-0 flex-1 truncate text-left"
                >
                  {workspace.name}
                </button>
              )}
              {renamingId !== workspace.id && (
                <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
                  <button
                    type="button"
                    onClick={() => startRename(workspace)}
                    className="rounded p-0.5 text-neutral-500 hover:bg-neutral-700 hover:text-neutral-200"
                    aria-label={`Rename ${workspace.name}`}
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport(workspace)}
                    className="rounded p-0.5 text-neutral-500 hover:bg-neutral-700 hover:text-neutral-200"
                    aria-label={`Export ${workspace.name}`}
                  >
                    <Download size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(workspace.id)}
                    className="rounded p-0.5 text-neutral-500 hover:bg-neutral-700 hover:text-red-400"
                    aria-label={`Delete ${workspace.name}`}
                  >
                    <X size={13} />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleCreate} className="mt-2 px-1 flex gap-1">
        <input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="New workspace…"
          className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
        />
        <input
          type="file"
          accept=".zip"
          ref={fileInputRef}
          onChange={handleImport}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="shrink-0 rounded-md border border-neutral-700 bg-neutral-800 p-1.5 text-neutral-400 hover:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-neutral-500"
          title="Import Workspace"
        >
          <Upload size={16} />
        </button>
      </form>

      {error && <div className="mt-2 px-1 text-xs text-red-400">{error}</div>}
    </div>
  )
}

export default WorkspaceList
