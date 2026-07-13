import { keymap, type KeyBinding } from '@uiw/react-codemirror'
import { formatActions } from './formatting'

// Maps each formatting action to its CodeMirror keybinding string. Kept
// separate from formatActions itself so the toolbar (which just needs
// action.run) doesn't have to know about key syntax at all.
const keyByActionId: Record<string, string> = {
  bold: 'Mod-b',
  italic: 'Mod-i',
  strikethrough: 'Mod-Shift-x',
  code: 'Mod-Shift-m',
  h1: 'Mod-1',
  h2: 'Mod-2',
  h3: 'Mod-3',
  bulletList: 'Mod-Shift-8',
  orderedList: 'Mod-Shift-7',
  checklist: 'Mod-Shift-c',
  blockquote: 'Mod-Shift-9',
  link: 'Mod-k',
  codeBlock: 'Mod-Shift-k'
}

const bindings: KeyBinding[] = formatActions
  .filter((action) => keyByActionId[action.id])
  .map((action) => ({
    key: keyByActionId[action.id],
    run: action.run,
    preventDefault: true
  }))

export const markdownKeymapExtension = keymap.of(bindings)
