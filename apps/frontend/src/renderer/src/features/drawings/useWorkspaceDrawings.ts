import { useCallback, useEffect, useState } from 'react'
import { createWorkspaceDrawing, deleteDrawing, listWorkspaceDrawings } from './noteDrawingsApi'
import type { Drawing, DrawingWithScene } from './types'

interface UseWorkspaceDrawingsResult {
  drawings: Drawing[]
  loading: boolean
  error: string | null
  create: (title: string) => Promise<DrawingWithScene | null>
  remove: (drawingId: string) => Promise<void>
  refresh: () => Promise<void>
}

export function useWorkspaceDrawings(workspaceId: string): UseWorkspaceDrawingsResult {
  const [drawings, setDrawings] = useState<Drawing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setDrawings(await listWorkspaceDrawings(workspaceId, true))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load drawings')
    }
  }, [workspaceId])

  useEffect(() => {
    let cancelled = false

    async function load(): Promise<void> {
      setLoading(true)
      try {
        const data = await listWorkspaceDrawings(workspaceId, true)
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
  }, [workspaceId])

  const create = useCallback(
    async (title: string): Promise<DrawingWithScene | null> => {
      try {
        const drawing = await createWorkspaceDrawing(workspaceId, title)
        setError(null)
        await refresh()
        return drawing
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create drawing')
        return null
      }
    },
    [workspaceId, refresh]
  )

  const remove = useCallback(
    async (drawingId: string) => {
      try {
        await deleteDrawing(workspaceId, null, drawingId)
        setError(null)
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete drawing')
      }
    },
    [workspaceId, refresh]
  )

  return { drawings, loading, error, create, remove, refresh }
}
