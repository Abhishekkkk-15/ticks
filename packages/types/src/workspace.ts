// ─── Workspaces ───────────────────────────────────────────────────────────────
export interface WorkspaceCreate {
  name: string
}

export interface WorkspaceRename {
  name: string
}

export interface Workspace {
  id: string
  name: string
  created_at: string
}

export interface GitSyncConfig {
  remote_url?: string | null
  branch?: string
  auto_sync_on_save?: boolean
  author_name?: string
  author_email?: string
}

export interface WorkspaceConfig {
  name: string
  created_at: string
  git_sync?: GitSyncConfig
}
