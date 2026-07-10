import { useCallback, useEffect, useState } from 'react'
import {
  createNote,
  deleteNote,
  importNote as importNoteApi,
  listFolders,
  listNotes,
  listRecentNotes,
  listTags,
  listTrash,
  purgeNote,
  restoreNote,
  setNoteFlags
} from './api'
import type { Note, NoteListItem } from './types'

export type NoteView = 'all' | 'favorites' | 'pinned' | 'recent' | 'trash'

interface UseNotesResult {
  notes: NoteListItem[]
  loading: boolean
  error: string | null
  query: string
  setQuery: (value: string) => void
  view: NoteView
  setView: (value: NoteView) => void
  folderFilter: string | null
  setFolderFilter: (value: string | null) => void
  tagFilter: string | null
  setTagFilter: (value: string | null) => void
  folders: string[]
  tags: string[]
  create: (title: string) => Promise<Note | null>
  remove: (id: string) => Promise<void>
  restore: (id: string) => Promise<void>
  purge: (id: string) => Promise<void>
  toggleFavorite: (note: Note) => Promise<void>
  togglePin: (note: Note) => Promise<void>
  importNote: (title: string, content: string) => Promise<Note | null>
  refresh: () => Promise<void>
}

const SEARCH_DEBOUNCE_MS = 250

async function fetchForView(
  workspaceId: string,
  view: NoteView,
  query: string
): Promise<NoteListItem[]> {
  if (view === 'recent') return listRecentNotes(workspaceId)
  if (view === 'trash') return listTrash(workspaceId)
  if (view === 'favorites') return listNotes(workspaceId, { query, favoriteOnly: true })
  if (view === 'pinned') return listNotes(workspaceId, { query, pinnedOnly: true })
  return listNotes(workspaceId, { query })
}

export function useNotes(workspaceId: string): UseNotesResult {
  const [notes, setNotes] = useState<NoteListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [view, setView] = useState<NoteView>('all')
  const [folderFilter, setFolderFilter] = useState<string | null>(null)
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [folders, setFolders] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])

  const refreshMeta = useCallback(async () => {
    try {
      const [nextFolders, nextTags] = await Promise.all([
        listFolders(workspaceId),
        listTags(workspaceId)
      ])
      setFolders(nextFolders)
      setTags(nextTags)
    } catch {
      // Folder/tag lists are a secondary affordance — a failure here
      // shouldn't block the note list itself from working.
    }
  }, [workspaceId])

  const refresh = useCallback(async () => {
    try {
      setNotes(await fetchForView(workspaceId, view, query))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes')
    }
    await refreshMeta()
  }, [workspaceId, view, query, refreshMeta])

  useEffect(() => {
    let cancelled = false

    async function run(): Promise<void> {
      setLoading(true)
      try {
        const data = await fetchForView(workspaceId, view, query)
        if (!cancelled) {
          setNotes(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load notes')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (!query) {
      run()
      return () => {
        cancelled = true
      }
    }

    const timer = setTimeout(run, SEARCH_DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [workspaceId, view, query])

  useEffect(() => {
    let cancelled = false

    async function load(): Promise<void> {
      try {
        const [nextFolders, nextTags] = await Promise.all([
          listFolders(workspaceId),
          listTags(workspaceId)
        ])
        if (!cancelled) {
          setFolders(nextFolders)
          setTags(nextTags)
        }
      } catch {
        // Folder/tag lists are a secondary affordance — a failure here
        // shouldn't block the note list itself from working.
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [workspaceId])

  const create = useCallback(
    async (title: string): Promise<Note | null> => {
      try {
        const note = await createNote(workspaceId, title)
        setError(null)
        await refresh()
        return note
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create note')
        return null
      }
    },
    [workspaceId, refresh]
  )

  const remove = useCallback(
    async (id: string) => {
      try {
        await deleteNote(workspaceId, id)
        setError(null)
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete note')
      }
    },
    [workspaceId, refresh]
  )

  const restore = useCallback(
    async (id: string) => {
      try {
        await restoreNote(workspaceId, id)
        setError(null)
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to restore note')
      }
    },
    [workspaceId, refresh]
  )

  const purge = useCallback(
    async (id: string) => {
      try {
        await purgeNote(workspaceId, id)
        setError(null)
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete note')
      }
    },
    [workspaceId, refresh]
  )

  const toggleFavorite = useCallback(
    async (note: Note) => {
      try {
        await setNoteFlags(workspaceId, note.id, { favorite: !note.favorite })
        setError(null)
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update note')
      }
    },
    [workspaceId, refresh]
  )

  const togglePin = useCallback(
    async (note: Note) => {
      try {
        await setNoteFlags(workspaceId, note.id, { pinned: !note.pinned })
        setError(null)
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update note')
      }
    },
    [workspaceId, refresh]
  )

  const importNote = useCallback(
    async (title: string, content: string): Promise<Note | null> => {
      try {
        const note = await importNoteApi(workspaceId, title, content)
        setError(null)
        await refresh()
        return note
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to import note')
        return null
      }
    },
    [workspaceId, refresh]
  )

  const filtered = notes.filter((note) => {
    if (folderFilter !== null && note.folder !== folderFilter) return false
    if (tagFilter !== null && !note.tags.includes(tagFilter)) return false
    return true
  })

  return {
    notes: filtered,
    loading,
    error,
    query,
    setQuery,
    view,
    setView,
    folderFilter,
    setFolderFilter,
    tagFilter,
    setTagFilter,
    folders,
    tags,
    create,
    remove,
    restore,
    purge,
    toggleFavorite,
    togglePin,
    importNote,
    refresh
  }
}
