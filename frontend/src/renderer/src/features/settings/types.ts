export type WorkflowTrigger = 'on_save' | 'on_copy' | 'on_paste' | 'shortcut'
// full_note  — run on entire note content (good for on_save summaries)
// selection  — run on currently selected text; falls back to full note if nothing selected
// clipboard  — run on what was just copied/pasted (only meaningful for on_copy/on_paste)
// new_text   — run only on content added since the last time this workflow ran on this note
export type WorkflowScope = 'full_note' | 'selection' | 'clipboard' | 'new_text'

export interface Workflow {
  id: string
  name: string
  trigger: WorkflowTrigger
  scope: WorkflowScope
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
