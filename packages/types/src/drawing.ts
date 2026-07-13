// ─── Drawings ─────────────────────────────────────────────────────────────────
export interface DrawingCreate {
  title: string
}

export interface DrawingRename {
  title: string
}

export interface DrawingSceneUpdate {
  scene: Record<string, unknown>
}

export interface Drawing {
  id: string
  note_id: string | null
  note_title?: string | null
  title: string
  created_at: string
  updated_at: string
}

export interface ExcalidrawScene {
  elements: unknown[]
  appState: Record<string, unknown>
  files: Record<string, unknown>
}

export interface DrawingScene extends Drawing {
  scene: ExcalidrawScene
}

export interface DrawingWithScene extends Drawing {
  scene: ExcalidrawScene
}
