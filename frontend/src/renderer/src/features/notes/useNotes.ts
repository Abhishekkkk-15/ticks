import { useCallback, useEffect, useState } from 'react'
import { createNote, deleteNote, importNote as importNoteApi, listNotes, setNoteFlags } from './api'
import type { Note, NoteListItem } from './types'

interface UseNotesResult {
  notes: NoteListItem[]
  loading: boolean
  error: string | null
  query: string
  setQuery: (value: string) => void
  favoriteOnly: boolean
  setFavoriteOnly: (value: boolean) => void
  create: (title: string) => Promise<Note | null>
  remove: (id: string) => Promise<void>
  toggleFavorite: (note: Note) => Promise<void>
  importNote: (title: string, content: string) => Promise<Note | null>
}

const SEARCH_DEBOUNCE_MS = 250

export function useNotes(workspaceId: string): UseNotesResult {
  const [notes, setNotes] = useState<NoteListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [favoriteOnly, setFavoriteOnly] = useState(false)

  const refresh = useCallback(async () => {
    try {
      setNotes(await listNotes(workspaceId, { query, favoriteOnly }))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes')
    }
  }, [workspaceId, query, favoriteOnly])

  useEffect(() => {
    let cancelled = false

    async function run(): Promise<void> {
      setLoading(true)
      try {
        const data = await listNotes(workspaceId, { query, favoriteOnly })
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
  }, [workspaceId, query, favoriteOnly])

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

  return {
    notes,
    loading,
    error,
    query,
    setQuery,
    favoriteOnly,
    setFavoriteOnly,
    create,
    remove,
    toggleFavorite,
    importNote
  }
}
