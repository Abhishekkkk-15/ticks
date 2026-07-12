import fs from 'fs';
import path from 'path';
import { settings } from '../config.js';
import { SettingsInfo } from '../types/settings.js';

const DEFAULT_DATA = {
  mistral_api_key: null as string | null,
  style_examples: [] as string[],
  theme: 'dark',
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
  workflows: [] as any[]
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
    workflows: data.workflows
  };
}

export function updateSettings(updateData: any): SettingsInfo {
  const data = readSettingsFile();
  for (const key of Object.keys(updateData)) {
    const isValidKey = key in DEFAULT_DATA && key !== 'mistral_api_key' && key !== 'style_examples';
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
