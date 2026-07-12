export interface Workflow {
  id: string;
  name: string;
  trigger: string;
  scope?: 'full_note' | 'selection' | 'clipboard' | 'new_text';
  output_mode?: 'append' | 'replace' | 'review';
  shortcut?: string | null;
  actions: string[];
}

export interface SettingsInfo {
  mistral_api_key_configured: boolean;
  style_examples: string[];
  theme: string;
  font_size: number;
  editor_font: string;
  autosave_delay: number;
  autosave_enabled: boolean;
  default_workspace_id?: string | null;
  default_editor_mode: string;
  mini_tray_size: string;
  keyboard_shortcuts: Record<string, string>;
  workflows: Workflow[];
}

export interface SettingsUpdate {
  theme?: string;
  font_size?: number;
  editor_font?: string;
  autosave_delay?: number;
  autosave_enabled?: boolean;
  default_workspace_id?: string | null;
  default_editor_mode?: string;
  mini_tray_size?: string;
  keyboard_shortcuts?: Record<string, string>;
  workflows?: Workflow[];
}

export interface MistralApiKeyUpdate {
  api_key: string;
}

export interface StyleExamplesUpdate {
  examples: string[];
}
