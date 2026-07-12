export interface WorkspaceCreate {
  name: string;
}

export interface WorkspaceRename {
  name: string;
}

export interface Workspace {
  id: string;
  name: string;
  created_at: string; // ISO date string
}
