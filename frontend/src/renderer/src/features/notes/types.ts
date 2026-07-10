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
}

export interface NoteDetail extends Note {
  content: string
}

export interface NoteListItem extends Note {
  snippet: string
}
