// Shared between the editor (CodeMirror base theme) and the markdown
// preview (prose vs prose-invert) so both agree on which themes are
// light-scheme without duplicating the list.
export const LIGHT_THEMES = new Set(['light', 'solarized-light'])

export function isLightTheme(theme: string | undefined | null): boolean {
  return LIGHT_THEMES.has(theme ?? '')
}
