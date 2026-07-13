export function matchShortcut(event: KeyboardEvent, shortcutStr: string): boolean {
  if (!shortcutStr) return false
  const parts = shortcutStr.toLowerCase().split('+')

  const hasCtrl = parts.includes('ctrl')
  const hasMeta = parts.includes('meta') || parts.includes('cmd')
  const hasShift = parts.includes('shift')
  const hasAlt = parts.includes('alt')

  // Find the non-modifier key
  const keyPart = parts.find((p) => !['ctrl', 'meta', 'cmd', 'shift', 'alt'].includes(p))
  if (!keyPart) return false

  const eventCtrl = event.ctrlKey
  const eventMeta = event.metaKey
  const eventShift = event.shiftKey
  const eventAlt = event.altKey

  // Check modifiers
  if (hasCtrl !== eventCtrl) return false
  if (hasMeta !== eventMeta) return false
  if (hasShift !== eventShift) return false
  if (hasAlt !== eventAlt) return false

  // Check key (case-insensitive)
  return event.key.toLowerCase() === keyPart
}
