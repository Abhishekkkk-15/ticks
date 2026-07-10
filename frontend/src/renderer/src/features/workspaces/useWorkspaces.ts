import { useCallback, useEffect, useState } from 'react'
import { createWorkspace, deleteWorkspace, listWorkspaces } from './api'
import type { Workspace } from './types'

export interface UseWorkspacesResult {
  workspaces: Workspace[]
  loading: boolean
  error: string | null
  create: (name: string) => Promise<void>
  remove: (id: string) => Promise<void>
}

export function useWorkspaces(): UseWorkspacesResult {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setWorkspaces(await listWorkspaces())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspaces')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load(): Promise<void> {
      setLoading(true)
      try {
        const data = await listWorkspaces()
        if (!cancelled) {
          setWorkspaces(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load workspaces')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  const create = useCallback(
    async (name: string) => {
      try {
        await createWorkspace(name)
        setError(null)
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create workspace')
      }
    },
    [refresh]
  )

  const remove = useCallback(
    async (id: string) => {
      try {
        await deleteWorkspace(id)
        setError(null)
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete workspace')
      }
    },
    [refresh]
  )

  return { workspaces, loading, error, create, remove }
}
