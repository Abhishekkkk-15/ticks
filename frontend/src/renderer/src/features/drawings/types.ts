export interface Drawing {
  id: string
  note_id: string
  title: string
  created_at: string
  updated_at: string
}

export interface ExcalidrawScene {
  elements: unknown[]
  appState: Record<string, unknown>
  files: Record<string, unknown>
}

export interface DrawingWithScene extends Drawing {
  scene: ExcalidrawScene
}
