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

export interface GitSyncConfig {
  remote_url?: string | null;
  branch?: string;
  auto_sync_on_save?: boolean;
}

export interface WorkspaceConfig {
  name: string;
  created_at: string;
  git_sync?: GitSyncConfig;
}
