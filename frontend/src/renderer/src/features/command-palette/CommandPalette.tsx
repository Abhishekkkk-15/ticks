import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { createNote, listNotes } from '../notes/api'
import type { Note, NoteListItem } from '../notes/types'
import type { UseWorkspacesResult } from '../workspaces/useWorkspaces'
import type { Workspace } from '../workspaces/types'

interface CommandPaletteProps {
  workspacesApi: UseWorkspacesResult
  activeWorkspaceId: string | null
  onSelectWorkspace: (workspace: Workspace) => void
  onOpenNote: (workspaceId: string, note: Note) => void
  onClose: () => void
}

interface PaletteCommand {
  id: string
  label: string
  hint?: string
  run: () => void
}

function CommandPalette({
  workspacesApi,
  activeWorkspaceId,
  onSelectWorkspace,
  onOpenNote,
  onClose
}: CommandPaletteProps): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [notes, setNotes] = useState<NoteListItem[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load(): Promise<void> {
      if (!activeWorkspaceId) {
        setNotes([])
        return
      }
      const data = await listNotes(activeWorkspaceId)
      if (!cancelled) setNotes(data)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [activeWorkspaceId])

  const commands: PaletteCommand[] = []

  if (activeWorkspaceId) {
    const workspaceId = activeWorkspaceId
    commands.push({
      id: 'new-note',
      label: 'New note in current workspace',
      run: async () => {
        const note = await createNote(workspaceId, 'Untitled')
        onOpenNote(workspaceId, note)
        onClose()
      }
    })
  }

  commands.push({
    id: 'new-workspace',
    label: 'New workspace',
    run: async () => {
      await workspacesApi.create('Untitled Workspace')
      onClose()
    }
  })

  for (const workspace of workspacesApi.workspaces) {
    commands.push({
      id: `ws-${workspace.id}`,
      label: `Switch workspace: ${workspace.name}`,
      run: () => {
        onSelectWorkspace(workspace)
        onClose()
      }
    })
  }

  for (const note of notes) {
    commands.push({
      id: `note-${note.id}`,
      label: `Open note: ${note.title}`,
      hint: note.snippet || undefined,
      run: () => {
        if (!activeWorkspaceId) return
        onOpenNote(activeWorkspaceId, note)
        onClose()
      }
    })
  }

  const lowerQuery = query.trim().toLowerCase()
  const filtered = lowerQuery
    ? commands.filter((c) => c.label.toLowerCase().includes(lowerQuery))
    : commands

  const clampedIndex = Math.min(selectedIndex, Math.max(filtered.length - 1, 0))

  function handleKeyDown(event: React.KeyboardEvent): void {
    if (event.key === 'Escape') {
      onClose()
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      filtered[clampedIndex]?.run()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/55 backdrop-blur-sm pt-[15vh]"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.97 }}
        transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
        className="w-full max-w-lg overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/90 shadow-2xl shadow-black/80 backdrop-blur-md"
        onClick={(event) => event.stopPropagation()}
      >
        <input
          autoFocus
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setSelectedIndex(0)
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a command or search notes/workspaces…"
          className="w-full border-b border-neutral-800 bg-transparent px-4 py-3.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none"
        />
        <div className="max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-neutral-500">No matches</div>
          ) : (
            filtered.map((command, index) => (
              <button
                key={command.id}
                type="button"
                onClick={() => command.run()}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left text-sm transition-colors ${
                  index === clampedIndex ? 'bg-neutral-800/80 text-neutral-100' : 'text-neutral-300'
                }`}
              >
                <span className="truncate">{command.label}</span>
                {command.hint && (
                  <span className="w-full truncate text-xs text-neutral-500">{command.hint}</span>
                )}
              </button>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default CommandPalette
