import { apiFetch } from '../../lib/api'
import type { Workspace } from './types'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

export function listWorkspaces(): Promise<Workspace[]> {
  return apiFetch<Workspace[]>('/workspaces')
}

export function createWorkspace(name: string): Promise<Workspace> {
  return apiFetch<Workspace>('/workspaces', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ name })
  })
}

export function deleteWorkspace(id: string): Promise<void> {
  return apiFetch<void>(`/workspaces/${id}`, { method: 'DELETE' })
}
