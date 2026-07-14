import { useState } from 'react'
import { setNoteFolder, setNoteTags } from './api'
import { useNotes } from './useNotes'
import type { Note } from './types'

interface NoteOrganizePanelProps {
  workspaceId: string
  note: Note
  onUpdated: (note: Note) => void
}

function NoteOrganizePanel({
  workspaceId,
  note,
  onUpdated
}: NoteOrganizePanelProps): React.JSX.Element {
  const [folderDraft, setFolderDraft] = useState(note.folder ?? '')
  const [tagsDraft, setTagsDraft] = useState(note.tags.join(', '))
  const { folders } = useNotes(workspaceId)

  async function commitFolder(): Promise<void> {
    const folder = folderDraft.trim() || null
    if (folder === note.folder) return
    onUpdated(await setNoteFolder(workspaceId, note.id, folder))
  }

  async function commitTags(): Promise<void> {
    const tags = tagsDraft
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    onUpdated(await setNoteTags(workspaceId, note.id, tags))
  }

  return (
    <div className="border-b border-neutral-800 px-3 py-3">
      <span className="mb-2 block text-xs font-medium tracking-wide text-neutral-500 uppercase">
        Organize
      </span>
      <div className="space-y-2">
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Folder</label>
          <input
            list="existing-folders"
            value={folderDraft}
            onChange={(event) => setFolderDraft(event.target.value)}
            onBlur={commitFolder}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur()
            }}
            placeholder="e.g. System Design/networking"
            className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs text-neutral-200 placeholder:text-neutral-500 focus:ring-1 focus:ring-neutral-500 focus:outline-none"
          />
          <datalist id="existing-folders">
            {folders.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Tags (comma-separated)</label>
          <input
            value={tagsDraft}
            onChange={(event) => setTagsDraft(event.target.value)}
            onBlur={commitTags}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur()
            }}
            placeholder="e.g. networking, dns"
            className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs text-neutral-200 placeholder:text-neutral-500 focus:ring-1 focus:ring-neutral-500 focus:outline-none"
          />
        </div>
      </div>
    </div>
  )
}

export default NoteOrganizePanel
