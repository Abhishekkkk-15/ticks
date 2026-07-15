import { apiFetch } from '../../lib/api'
import type { Note, NoteDetail, NoteListItem } from './types'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

interface ListNotesOptions {
  query?: string
  favoriteOnly?: boolean
  pinnedOnly?: boolean
}

export function listNotes(
  workspaceId: string,
  options: ListNotesOptions = {}
): Promise<NoteListItem[]> {
  const params = new URLSearchParams()
  if (options.query) params.set('q', options.query)
  if (options.favoriteOnly) params.set('favorite_only', 'true')
  if (options.pinnedOnly) params.set('pinned_only', 'true')
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return apiFetch<NoteListItem[]>(`/workspaces/${workspaceId}/notes${suffix}`)
}

export function listRecentNotes(workspaceId: string): Promise<NoteListItem[]> {
  return apiFetch<NoteListItem[]>(`/workspaces/${workspaceId}/notes/recent`)
}

export function listTrash(workspaceId: string): Promise<NoteListItem[]> {
  return apiFetch<NoteListItem[]>(`/workspaces/${workspaceId}/notes/trash`)
}

export function listFolders(workspaceId: string): Promise<string[]> {
  return apiFetch<string[]>(`/workspaces/${workspaceId}/folders`)
}

export function createFolder(workspaceId: string, name: string): Promise<void> {
  return apiFetch<void>(`/workspaces/${workspaceId}/folders`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ name })
  })
}

export function deleteFolder(workspaceId: string, name: string): Promise<void> {
  return apiFetch<void>(`/workspaces/${workspaceId}/folders`, {
    method: 'DELETE',
    headers: JSON_HEADERS,
    body: JSON.stringify({ name })
  })
}

export function listTags(workspaceId: string): Promise<string[]> {
  return apiFetch<string[]>(`/workspaces/${workspaceId}/tags`)
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

export function setNoteFolder(
  workspaceId: string,
  noteId: string,
  folder: string | null
): Promise<Note> {
  return apiFetch<Note>(`/workspaces/${workspaceId}/notes/${noteId}/folder`, {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: JSON.stringify({ folder })
  })
}

export function setNoteTags(workspaceId: string, noteId: string, tags: string[]): Promise<Note> {
  return apiFetch<Note>(`/workspaces/${workspaceId}/notes/${noteId}/tags`, {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: JSON.stringify({ tags })
  })
}

// Soft delete — moves the note to Trash. Use purgeNote to remove for good.
export function deleteNote(workspaceId: string, noteId: string): Promise<void> {
  return apiFetch<void>(`/workspaces/${workspaceId}/notes/${noteId}`, { method: 'DELETE' })
}

export function restoreNote(workspaceId: string, noteId: string): Promise<Note> {
  return apiFetch<Note>(`/workspaces/${workspaceId}/notes/${noteId}/restore`, { method: 'POST' })
}

export function purgeNote(workspaceId: string, noteId: string): Promise<void> {
  return apiFetch<void>(`/workspaces/${workspaceId}/notes/${noteId}/permanent`, {
    method: 'DELETE'
  })
}
