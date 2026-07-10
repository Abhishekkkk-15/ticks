import { useCallback, useEffect, useState } from 'react'
import { createNote, deleteNote, importNote as importNoteApi, listNotes, setNoteFlags } from './api'
import type { Note } from './types'

interface UseNotesResult {
  notes: Note[]
  loading: boolean
  error: string | null
  query: string
  setQuery: (value: string) => void
  create: (title: string) => Promise<Note | null>
  remove: (id: string) => Promise<void>
  toggleFavorite: (note: Note) => Promise<void>
  importNote: (title: string, content: string) => Promise<Note | null>
}

const SEARCH_DEBOUNCE_MS = 250

export function useNotes(workspaceId: string): UseNotesResult {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const refresh = useCallback(
    async (q: string) => {
      setLoading(true)
      try {
        setNotes(await listNotes(workspaceId, q))
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load notes')
      } finally {
        setLoading(false)
      }
    },
    [workspaceId]
  )

  useEffect(() => {
    let cancelled = false

    async function run(): Promise<void> {
      setLoading(true)
      try {
        const data = await listNotes(workspaceId, query)
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
  }, [workspaceId, query])

  const create = useCallback(
    async (title: string): Promise<Note | null> => {
      try {
        const note = await createNote(workspaceId, title)
        setError(null)
        await refresh(query)
        return note
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create note')
        return null
      }
    },
    [workspaceId, query, refresh]
  )

  const remove = useCallback(
    async (id: string) => {
      try {
        await deleteNote(workspaceId, id)
        setError(null)
        await refresh(query)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete note')
      }
    },
    [workspaceId, query, refresh]
  )

  const toggleFavorite = useCallback(
    async (note: Note) => {
      try {
        await setNoteFlags(workspaceId, note.id, { favorite: !note.favorite })
        setError(null)
        await refresh(query)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update note')
      }
    },
    [workspaceId, query, refresh]
  )

  const importNote = useCallback(
    async (title: string, content: string): Promise<Note | null> => {
      try {
        const note = await importNoteApi(workspaceId, title, content)
        setError(null)
        await refresh(query)
        return note
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to import note')
        return null
      }
    },
    [workspaceId, query, refresh]
  )

  return { notes, loading, error, query, setQuery, create, remove, toggleFavorite, importNote }
}
