export interface Note {
  id: string
  title: string
  created_at: string
  updated_at: string
  favorite: boolean
  pinned: boolean
}

export interface NoteDetail extends Note {
  content: string
}
