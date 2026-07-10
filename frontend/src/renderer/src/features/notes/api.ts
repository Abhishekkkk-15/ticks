import { apiFetch } from '../../lib/api'
import type { Note, NoteDetail, NoteListItem } from './types'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

interface ListNotesOptions {
  query?: string
  favoriteOnly?: boolean
}

export function listNotes(
  workspaceId: string,
  options: ListNotesOptions = {}
): Promise<NoteListItem[]> {
  const params = new URLSearchParams()
  if (options.query) params.set('q', options.query)
  if (options.favoriteOnly) params.set('favorite_only', 'true')
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return apiFetch<NoteListItem[]>(`/workspaces/${workspaceId}/notes${suffix}`)
}

export function getNote(workspaceId: string, noteId: string): Promise<NoteDetail> {
  return apiFetch<NoteDetail>(`/workspaces/${workspaceId}/notes/${noteId}`)
}

export function createNote(workspaceId: string, title: string): Promise<NoteDetail> {
  return apiFetch<NoteDetail>(`/workspaces/${workspaceId}/notes`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ title })
  })
}

export function importNote(
  workspaceId: string,
  title: string,
  content: string
): Promise<NoteDetail> {
  return apiFetch<NoteDetail>(`/workspaces/${workspaceId}/notes/import`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ title, content })
  })
}

export function renameNote(workspaceId: string, noteId: string, title: string): Promise<Note> {
  return apiFetch<Note>(`/workspaces/${workspaceId}/notes/${noteId}`, {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: JSON.stringify({ title })
  })
}

export function updateNoteContent(
  workspaceId: string,
  noteId: string,
  content: string
): Promise<Note> {
  return apiFetch<Note>(`/workspaces/${workspaceId}/notes/${noteId}/content`, {
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify({ content })
  })
}

export function setNoteFlags(
  workspaceId: string,
  noteId: string,
  flags: { favorite?: boolean; pinned?: boolean }
): Promise<Note> {
  return apiFetch<Note>(`/workspaces/${workspaceId}/notes/${noteId}/flags`, {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: JSON.stringify(flags)
  })
}

export function duplicateNote(workspaceId: string, noteId: string): Promise<NoteDetail> {
  return apiFetch<NoteDetail>(`/workspaces/${workspaceId}/notes/${noteId}/duplicate`, {
    method: 'POST'
  })
}

export function moveNote(
  workspaceId: string,
  noteId: string,
  targetWorkspaceId: string
): Promise<Note> {
  return apiFetch<Note>(`/workspaces/${workspaceId}/notes/${noteId}/move`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ target_workspace_id: targetWorkspaceId })
  })
}

export function deleteNote(workspaceId: string, noteId: string): Promise<void> {
  return apiFetch<void>(`/workspaces/${workspaceId}/notes/${noteId}`, { method: 'DELETE' })
}
