import { EditorView, keymap, type KeyBinding } from '@uiw/react-codemirror'

function wrapSelection(marker: string) {
  return (view: EditorView): boolean => {
    const range = view.state.selection.main
    const selectedText = view.state.sliceDoc(range.from, range.to)

    view.dispatch({
      changes: { from: range.from, to: range.to, insert: `${marker}${selectedText}${marker}` },
      selection: {
        anchor: range.from + marker.length,
        head: range.from + marker.length + selectedText.length
      },
      scrollIntoView: true
    })
    return true
  }
}

const markdownShortcuts: KeyBinding[] = [
  { key: 'Mod-b', run: wrapSelection('**'), preventDefault: true },
  { key: 'Mod-i', run: wrapSelection('*'), preventDefault: true }
]

export const markdownKeymapExtension = keymap.of(markdownShortcuts)
