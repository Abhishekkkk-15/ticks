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

export function getNoteDrawing(
  workspaceId: string,
  noteId: string,
  drawingId: string
): Promise<DrawingWithScene> {
  return apiFetch<DrawingWithScene>(
    `/workspaces/${workspaceId}/notes/${noteId}/drawings/${drawingId}`
  )
}

export function saveDrawingScene(
  workspaceId: string,
  noteId: string,
  drawingId: string,
  scene: ExcalidrawScene
): Promise<Drawing> {
  return apiFetch<Drawing>(
    `/workspaces/${workspaceId}/notes/${noteId}/drawings/${drawingId}/scene`,
    {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON.stringify({ scene })
    }
  )
}

export function renameDrawing(
  workspaceId: string,
  noteId: string,
  drawingId: string,
  title: string
): Promise<Drawing> {
  return apiFetch<Drawing>(`/workspaces/${workspaceId}/notes/${noteId}/drawings/${drawingId}`, {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: JSON.stringify({ title })
  })
}

export function deleteDrawing(
  workspaceId: string,
  noteId: string,
  drawingId: string
): Promise<void> {
  return apiFetch<void>(`/workspaces/${workspaceId}/notes/${noteId}/drawings/${drawingId}`, {
    method: 'DELETE'
  })
}
