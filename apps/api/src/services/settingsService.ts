import fs from 'fs';
import path from 'path';
import { settings } from '../config.js';
import { SettingsInfo } from '@ticks/types';

const DEFAULT_DATA = {
  mistral_api_key: null as string | null,
  style_examples: [] as string[],
  theme: 'solarized-light',
  font_size: 14,
  editor_font: 'monospace',
  autosave_delay: 800,
  autosave_enabled: true,
  default_workspace_id: null as string | null,
  default_editor_mode: 'split',
  mini_tray_size: 'default',
  keyboard_shortcuts: {
    command_palette: 'Ctrl+Shift+P',
    global_capture: 'Ctrl+Alt+Shift+C',
    mini_tray_toggle: 'Ctrl+Alt+Shift+M',
    trigger_ai: 'Ctrl+Shift+A',
    ai_summarize: '',
    ai_explain: '',
    ai_key_points: '',
    ai_questions: '',
    ai_flashcards: '',
    ai_checklist: '',
    ai_table: '',
    ai_expand: '',
    ai_shorten: '',
    ai_examples: '',
    ai_style: '',
    ai_format: ''
  } as Record<string, string>,
  workflows: [] as any[],
  mcp_enabled: false,
  mcp_permitted_notes: [] as string[],
  mcp_permitted_tools: [
    'list_workspaces',
    'list_notes',
    'read_note',
    'search_notes',
    'read_drawing',
    'read_resource',
    'create_note',
    'update_note',
    'patch_note',
    'write_drawing'
  ] as string[],
  dropbox_app_key: null as string | null,
  dropbox_refresh_token: null as string | null,
  dropbox_auto_sync: false,
  dropbox_sync_cursor: null as string | null,
  windows_native_snapping: false
};

function readSettingsFile(): any {
  if (!fs.existsSync(settings.settingsPath)) {
    return { ...DEFAULT_DATA };
  }
  try {
    const data = JSON.parse(fs.readFileSync(settings.settingsPath, 'utf8'));
    const merged = { ...DEFAULT_DATA, ...data };
    if (data.keyboard_shortcuts && typeof data.keyboard_shortcuts === 'object') {
      merged.keyboard_shortcuts = {
        ...DEFAULT_DATA.keyboard_shortcuts,
        ...data.keyboard_shortcuts
      };
    }
    return merged;
  } catch (e) {
    return { ...DEFAULT_DATA };
  }
}

function writeSettingsFile(data: any): void {
  fs.mkdirSync(path.dirname(settings.settingsPath), { recursive: true });
  fs.writeFileSync(settings.settingsPath, JSON.stringify(data, null, 2), 'utf8');
}

export function getMistralApiKey(): string | null {
  return readSettingsFile().mistral_api_key || settings.mistralApiKey;
}

export function setMistralApiKey(apiKey: string): void {
  const data = readSettingsFile();
  data.mistral_api_key = apiKey.trim() || null;
  writeSettingsFile(data);
}

export function getStyleExamples(): string[] {
  return [...readSettingsFile().style_examples];
}

export function setStyleExamples(examples: string[]): string[] {
  const cleaned = examples.map(e => e.trim()).filter(e => e.length > 0);
  const data = readSettingsFile();
  data.style_examples = cleaned;
  writeSettingsFile(data);
  return cleaned;
}

export function getSettingsInfo(): SettingsInfo {
  const data = readSettingsFile();
  return {
    mistral_api_key_configured: !!getMistralApiKey(),
    style_examples: getStyleExamples(),
    theme: data.theme,
    font_size: data.font_size,
    editor_font: data.editor_font,
    autosave_delay: data.autosave_delay,
    autosave_enabled: data.autosave_enabled,
    default_workspace_id: data.default_workspace_id,
    default_editor_mode: data.default_editor_mode,
    mini_tray_size: data.mini_tray_size,
    keyboard_shortcuts: data.keyboard_shortcuts,
    workflows: data.workflows,
    mcp_enabled: data.mcp_enabled,
    mcp_permitted_notes: data.mcp_permitted_notes || [],
    mcp_permitted_tools: data.mcp_permitted_tools || [],
    dropbox_app_key: data.dropbox_app_key,
    dropbox_connected: !!data.dropbox_refresh_token,
    dropbox_auto_sync: !!data.dropbox_auto_sync,
    windows_native_snapping: !!data.windows_native_snapping
  };
}

export function updateSettings(updateData: any): SettingsInfo {
  const data = readSettingsFile();
  for (const key of Object.keys(updateData)) {
    const isValidKey = key in DEFAULT_DATA && key !== 'mistral_api_key' && key !== 'style_examples' && key !== 'dropbox_refresh_token' && key !== 'dropbox_sync_cursor';
    if (isValidKey) {
      if (key === 'keyboard_shortcuts' && typeof updateData[key] === 'object' && updateData[key] !== null) {
        data[key] = { ...data[key], ...updateData[key] };
      } else {
        data[key] = updateData[key];
      }
    }
  }
  writeSettingsFile(data);
  return getSettingsInfo();
}

export function getDropboxToken(): string | null {
  return readSettingsFile().dropbox_refresh_token || null;
}

export function setDropboxToken(token: string | null): void {
  const data = readSettingsFile();
  data.dropbox_refresh_token = token;
  writeSettingsFile(data);
}

export function getDropboxCursor(): string | null {
  return readSettingsFile().dropbox_sync_cursor || null;
}

export function setDropboxCursor(cursor: string | null): void {
  const data = readSettingsFile();
  data.dropbox_sync_cursor = cursor;
  writeSettingsFile(data);
}
