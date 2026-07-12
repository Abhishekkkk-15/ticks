export interface DrawingCreate {
  title: string;
}

export interface DrawingRename {
  title: string;
}

export interface DrawingSceneUpdate {
  scene: Record<string, any>;
}

export interface Drawing {
  id: string;
  note_id?: string | null;
  note_title?: string | null;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface DrawingScene extends Drawing {
  scene: Record<string, any>;
}
