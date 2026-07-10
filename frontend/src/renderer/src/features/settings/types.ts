export interface SettingsInfo {
  mistral_api_key_configured: boolean
  style_examples: string[]
  theme: string
  font_size: number
  editor_font: string
  autosave_delay: number
  default_workspace_id: string | null
  default_editor_mode: 'edit' | 'preview' | 'split'
  keyboard_shortcuts: Record<string, string>
}

export interface SettingsUpdate {
  theme?: string
  font_size?: number
  editor_font?: string
  autosave_delay?: number
  default_workspace_id?: string | null
  default_editor_mode?: 'edit' | 'preview' | 'split'
  keyboard_shortcuts?: Record<string, string>
}
