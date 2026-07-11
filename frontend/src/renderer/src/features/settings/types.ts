export type WorkflowTrigger = 'on_save' | 'on_copy' | 'on_paste' | 'shortcut'

export interface Workflow {
  id: string
  name: string
  trigger: WorkflowTrigger
  shortcut: string | null
  actions: string[]
}

export interface SettingsInfo {
  mistral_api_key_configured: boolean
  style_examples: string[]
  theme: string
  font_size: number
  editor_font: string
  autosave_delay: number
  autosave_enabled: boolean
  default_workspace_id: string | null
  default_editor_mode: 'edit' | 'preview' | 'split'
  mini_tray_size: 'compact' | 'default' | 'tall'
  keyboard_shortcuts: Record<string, string>
  workflows: Workflow[]
}

export interface SettingsUpdate {
  theme?: string
  font_size?: number
  editor_font?: string
  autosave_delay?: number
  autosave_enabled?: boolean
  default_workspace_id?: string | null
  default_editor_mode?: 'edit' | 'preview' | 'split'
  mini_tray_size?: 'compact' | 'default' | 'tall'
  keyboard_shortcuts?: Record<string, string>
  workflows?: Workflow[]
}
