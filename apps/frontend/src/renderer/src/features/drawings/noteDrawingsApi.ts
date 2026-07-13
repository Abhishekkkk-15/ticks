import { apiFetch } from '../../lib/api'
import type { Drawing, DrawingWithScene, ExcalidrawScene } from './types'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

export function listNoteDrawings(workspaceId: string, noteId: string): Promise<Drawing[]> {
  return apiFetch<Drawing[]>(`/workspaces/${workspaceId}/notes/${noteId}/drawings`)
}

export function createNoteDrawing(
  workspaceId: string,
  noteId: string,
  title: string
): Promise<DrawingWithScene> {
  return apiFetch<DrawingWithScene>(`/workspaces/${workspaceId}/notes/${noteId}/drawings`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ title })
  })
}

// get/save/rename/delete are id-only on the backend regardless of whether a
// drawing was created under a note or at the workspace level, so noteId here
// only affects which URL prefix is used, not the underlying behavior.
function drawingsBase(workspaceId: string, noteId: string | null): string {
  return noteId
    ? `/workspaces/${workspaceId}/notes/${noteId}/drawings`
    : `/workspaces/${workspaceId}/drawings`
}

export function getNoteDrawing(
  workspaceId: string,
  noteId: string | null,
  drawingId: string
): Promise<DrawingWithScene> {
  return apiFetch<DrawingWithScene>(`${drawingsBase(workspaceId, noteId)}/${drawingId}`)
}

export function saveDrawingScene(
  workspaceId: string,
  noteId: string | null,
  drawingId: string,
  scene: ExcalidrawScene
): Promise<Drawing> {
  return apiFetch<Drawing>(`${drawingsBase(workspaceId, noteId)}/${drawingId}/scene`, {
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify({ scene })
  })
}

export function renameDrawing(
  workspaceId: string,
  noteId: string | null,
  drawingId: string,
  title: string
): Promise<Drawing> {
  return apiFetch<Drawing>(`${drawingsBase(workspaceId, noteId)}/${drawingId}`, {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: JSON.stringify({ title })
  })
}

export function deleteDrawing(
  workspaceId: string,
  noteId: string | null,
  drawingId: string
): Promise<void> {
  return apiFetch<void>(`${drawingsBase(workspaceId, noteId)}/${drawingId}`, {
    method: 'DELETE'
  })
}

export function listWorkspaceDrawings(workspaceId: string, includeAll: boolean = false): Promise<Drawing[]> {
  const query = includeAll ? '?include_all=true' : ''
  return apiFetch<Drawing[]>(`/workspaces/${workspaceId}/drawings${query}`)
}

export function createWorkspaceDrawing(
  workspaceId: string,
  title: string
): Promise<DrawingWithScene> {
  return apiFetch<DrawingWithScene>(`/workspaces/${workspaceId}/drawings`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ title })
  })
}
