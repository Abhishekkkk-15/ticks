// ─── Notes ────────────────────────────────────────────────────────────────────
export interface NoteCreate {
  title: string
  content?: string
}

export interface NoteImport {
  title: string
  content: string
}

export interface NoteRename {
  title: string
}

export interface NoteContentUpdate {
  content: string
}

export interface NoteFlags {
  favorite?: boolean | null
  pinned?: boolean | null
}

export interface NoteMove {
  target_workspace_id: string
}

export interface NoteFolderUpdate {
  folder?: string | null
}

export interface NoteTagsUpdate {
  tags: string[]
}

export interface NoteCommentsUpdate {
  comments: NoteComment[]
}

export interface NoteComment {
  id: string
  text: string
  created_at: string
  resolved: boolean
}

export interface Note {
  id: string
  title: string
  created_at: string
  updated_at: string
  favorite: boolean
  pinned: boolean
  folder: string | null
  tags: string[]
  trashed: boolean
  trashed_at: string | null
  opened_at: string | null
  comments?: NoteComment[]
}

export interface NoteDetail extends Note {
  content: string
}

export interface NoteListItem extends Note {
  snippet: string
}
