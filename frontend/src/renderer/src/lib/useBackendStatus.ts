import { useEffect, useState } from 'react'
import { apiFetch } from './api'

export type BackendStatus = 'connecting' | 'connected' | 'offline'

const POLL_INTERVAL_MS = 1500

export function useBackendStatus(): BackendStatus {
  const [status, setStatus] = useState<BackendStatus>('connecting')

  useEffect(() => {
    let cancelled = false

    async function checkHealth(): Promise<void> {
      try {
        await apiFetch<{ status: string }>('/health')
        if (!cancelled) setStatus('connected')
      } catch (error) {
        console.error('health check failed', error)
        if (!cancelled) setStatus('offline')
      }
    }

    checkHealth()
    const interval = setInterval(checkHealth, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return status
}
