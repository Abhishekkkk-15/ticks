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

export function renameWorkspace(id: string, name: string): Promise<Workspace> {
  return apiFetch<Workspace>(`/workspaces/${id}`, {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: JSON.stringify({ name })
  })
}

export async function getExportWorkspaceUrl(id: string): Promise<string> {
  const baseUrl = await window.api.getApiBaseUrl()
  return `${baseUrl}/workspaces/${id}/export`
}

export async function importWorkspace(file: File, name: string): Promise<Workspace> {
  const baseUrl = await window.api.getApiBaseUrl()
  const formData = new FormData()
  formData.append('file', file)
  formData.append('name', name)
  
  const response = await fetch(`${baseUrl}/workspaces/import`, {
    method: 'POST',
    body: formData
  })
  
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.message ?? `API error ${response.status}`)
  }
  
  return response.json() as Promise<Workspace>
}
