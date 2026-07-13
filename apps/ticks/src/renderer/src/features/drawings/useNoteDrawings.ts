import { useCallback, useEffect, useState } from 'react'
import { createNoteDrawing, deleteDrawing, listNoteDrawings } from './noteDrawingsApi'
import type { Drawing, DrawingWithScene } from './types'

interface UseNoteDrawingsResult {
  drawings: Drawing[]
  loading: boolean
  error: string | null
  create: (title: string) => Promise<DrawingWithScene | null>
  remove: (drawingId: string) => Promise<void>
  refresh: () => Promise<void>
}

export function useNoteDrawings(workspaceId: string, noteId: string): UseNoteDrawingsResult {
  const [drawings, setDrawings] = useState<Drawing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setDrawings(await listNoteDrawings(workspaceId, noteId))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load drawings')
    }
  }, [workspaceId, noteId])

  useEffect(() => {
    let cancelled = false

    async function load(): Promise<void> {
      setLoading(true)
      try {
        const data = await listNoteDrawings(workspaceId, noteId)
        if (!cancelled) {
          setDrawings(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load drawings')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [workspaceId, noteId])

  const create = useCallback(
    async (title: string): Promise<DrawingWithScene | null> => {
      try {
        const drawing = await createNoteDrawing(workspaceId, noteId, title)
        setError(null)
        await refresh()
        return drawing
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create drawing')
        return null
      }
    },
    [workspaceId, noteId, refresh]
  )

  const remove = useCallback(
    async (drawingId: string) => {
      try {
        await deleteDrawing(workspaceId, noteId, drawingId)
        setError(null)
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete drawing')
      }
    },
    [workspaceId, noteId, refresh]
  )

  return { drawings, loading, error, create, remove, refresh }
}
