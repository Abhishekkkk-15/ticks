import { useCallback, useEffect, useState } from 'react'
import { createUrlResource, deleteResource, listResources, uploadFileResource } from './api'
import type { Resource, ResourceType } from './types'

const POLL_INTERVAL_MS = 1500
const TERMINAL_STATUSES = new Set(['completed', 'failed'])

interface UseResourcesResult {
  resources: Resource[]
  loading: boolean
  error: string | null
  addUrl: (type: ResourceType, source: string, title: string) => Promise<void>
  addFile: (type: ResourceType, title: string, filename: string, data: Uint8Array) => Promise<void>
  remove: (resourceId: string) => Promise<void>
}

export function useResources(workspaceId: string, noteId: string): UseResourcesResult {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setResources(await listResources(workspaceId, noteId))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load resources')
    }
  }, [workspaceId, noteId])

  useEffect(() => {
    let cancelled = false

    async function load(): Promise<void> {
      setLoading(true)
      try {
        const data = await listResources(workspaceId, noteId)
        if (!cancelled) {
          setResources(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load resources')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [workspaceId, noteId])

  useEffect(() => {
    const hasPending = resources.some((r) => !TERMINAL_STATUSES.has(r.status))
    if (!hasPending) return undefined

    const interval = setInterval(async () => {
      try {
        setResources(await listResources(workspaceId, noteId))
      } catch {
        // Best-effort poll — errors from user actions are already surfaced.
      }
    }, POLL_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [resources, workspaceId, noteId])

  const addUrl = useCallback(
    async (type: ResourceType, source: string, title: string) => {
      try {
        await createUrlResource(workspaceId, noteId, type, source, title)
        setError(null)
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add resource')
      }
    },
    [workspaceId, noteId, refresh]
  )

  const addFile = useCallback(
    async (type: ResourceType, title: string, filename: string, data: Uint8Array) => {
      try {
        await uploadFileResource(workspaceId, noteId, type, title, filename, data)
        setError(null)
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to upload resource')
      }
    },
    [workspaceId, noteId, refresh]
  )

  const remove = useCallback(
    async (resourceId: string) => {
      try {
        await deleteResource(workspaceId, noteId, resourceId)
        setError(null)
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete resource')
      }
    },
    [workspaceId, noteId, refresh]
  )

  return { resources, loading, error, addUrl, addFile, remove }
}
