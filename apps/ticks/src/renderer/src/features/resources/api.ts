import { apiFetch } from '../../lib/api'
import type { Resource, ResourceType } from './types'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

export function listResources(workspaceId: string, noteId: string): Promise<Resource[]> {
  return apiFetch<Resource[]>(`/workspaces/${workspaceId}/notes/${noteId}/resources`)
}

export function createUrlResource(
  workspaceId: string,
  noteId: string,
  type: ResourceType,
  source: string,
  title: string
): Promise<Resource> {
  return apiFetch<Resource>(`/workspaces/${workspaceId}/notes/${noteId}/resources`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ type, source, title })
  })
}

export function uploadFileResource(
  workspaceId: string,
  noteId: string,
  type: ResourceType,
  title: string,
  filename: string,
  data: Uint8Array
): Promise<Resource> {
  const formData = new FormData()
  formData.append('type', type)
  formData.append('title', title)
  formData.append('file', new Blob([data as unknown as ArrayBuffer]), filename)
  return apiFetch<Resource>(`/workspaces/${workspaceId}/notes/${noteId}/resources/upload`, {
    method: 'POST',
    body: formData
  })
}

export function deleteResource(
  workspaceId: string,
  noteId: string,
  resourceId: string
): Promise<void> {
  return apiFetch<void>(`/workspaces/${workspaceId}/notes/${noteId}/resources/${resourceId}`, {
    method: 'DELETE'
  })
}

export function getResourceLocalPath(
  workspaceId: string,
  noteId: string,
  resourceId: string
): Promise<{ path: string }> {
  return apiFetch<{ path: string }>(
    `/workspaces/${workspaceId}/notes/${noteId}/resources/${resourceId}/file-path`
  )
}
