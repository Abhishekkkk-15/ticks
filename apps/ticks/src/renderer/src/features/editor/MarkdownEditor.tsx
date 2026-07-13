import { useMemo } from 'react'
import type { Ref } from 'react'
import CodeMirror, { EditorView } from '@uiw/react-codemirror'
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { autocompletion } from '@codemirror/autocomplete'
import { keymap } from '@codemirror/view'
import { moveLineUp, moveLineDown, copyLineUp, copyLineDown, toggleComment } from '@codemirror/commands'
import { searchKeymap, selectNextOccurrence, selectSelectionMatches } from '@codemirror/search'
import { showMinimap as minimapFacet } from '@replit/codemirror-minimap'
import { markdownKeymapExtension } from './markdownShortcuts'
import { useSettings } from '../settings/SettingsContext'
import { isLightTheme } from '../settings/themeUtils'
import { getClipboardImageFile, uploadPastedImage } from '../notes/pasteImage'

export interface EditorSelection {
  text: string
  from: number
  to: number
}

interface MinimalViewUpdate {
  selectionSet: boolean
  state: {
    selection: { main: { from: number; to: number } }
    sliceDoc: (from: number, to: number) => string
  }
}

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  onSelectionChange?: (selection: EditorSelection) => void
  editorRef?: Ref<ReactCodeMirrorRef>
  notes?: { id: string; title: string }[]
  workspaceId?: string
  noteId?: string
  onPaste?: (event: ClipboardEvent) => void
  showMinimap?: boolean
}

const baseExtensions = [
  markdown({ codeLanguages: languages }),
  markdownKeymapExtension,
  // Alt+Click adds a new cursor instead of moving the single cursor
  EditorView.clickAddsSelectionRange.of((e) => e.altKey),
  EditorView.contentAttributes.of({
    spellcheck: 'true',
    autocorrect: 'on',
    autocapitalize: 'sentences'
  })
]

// Overrides CodeMirror's built-in 'light'/'dark' chrome (background, gutters,
// selection, cursor) with our theme's actual CSS variables, so all 7 app
// themes (not just a generic dark/light split) are reflected in the editor —
// registered after the base theme in the extensions array, so it wins for
// any overlapping rule. Syntax token colors still come from the base 'dark'/
// 'light' string theme, since those only meaningfully differ by light vs dark.
const chromeTheme = EditorView.theme({
  '&': {
    backgroundColor: 'var(--color-neutral-900)',
    color: 'var(--color-neutral-100)'
  },
  '.cm-content': { caretColor: 'var(--color-neutral-100)' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--color-neutral-100)' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: 'var(--color-neutral-700)'
  },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    color: 'var(--color-neutral-600)',
    border: 'none'
  },
  '.cm-activeLine': { backgroundColor: 'var(--color-neutral-800)' },
  '.cm-activeLineGutter': { backgroundColor: 'transparent' }
})

function MarkdownEditor({
  value,
  onChange,
  onSelectionChange,
  editorRef,
  notes = [],
  workspaceId,
  noteId,
  onPaste,
  showMinimap = true
}: MarkdownEditorProps): React.JSX.Element {
  const { settings } = useSettings()

  const fontTheme = useMemo(() => {
    // Use the same CSS variables that SettingsContext injects onto :root,
    // so the editor always matches whatever font the rest of the app uses.
    const font = `var(--app-font, ${settings?.editor_font || 'monospace'})`
    const size = `var(--app-font-size, ${settings?.font_size || 14}px)`
    return EditorView.theme({
      '&.cm-editor': {
        fontSize: size,
        height: '100%'
      },
      '.cm-content': {
        fontFamily: font,
        padding: '16px 20px'
      },
      '.cm-gutters': {
        fontFamily: font,
        border: 'none',
        backgroundColor: 'transparent'
      }
    })
  }, [settings?.editor_font, settings?.font_size])

  const autocompleteExtension = useMemo(() => {
    if (!notes || notes.length === 0) return []
    return autocompletion({
      override: [
        (context) => {
          const word = context.matchBefore(/\[\[[^\]]*$/)
          if (!word) return null
          return {
            from: word.from,
            options: notes.map((note) => ({
              label: note.title,
              displayLabel: note.title,
              type: 'keyword',
              apply: (view, _completion, from, to) => {
                let end = to
                const nextChars = view.state.sliceDoc(to, to + 2)
                if (nextChars === ']]') {
                  end = to + 2
                }
                const insertText = `[${note.title}](note://${note.id})`
                view.dispatch({
                  changes: { from, to: end, insert: insertText },
                  selection: { anchor: from + insertText.length }
                })
              }
            }))
          }
        }
      ]
    })
  }, [notes])

  const domEventHandlers = useMemo(() => {
    return EditorView.domEventHandlers({
      paste(event, view) {
        if (workspaceId && noteId) {
          const file = getClipboardImageFile(event.clipboardData!)
          if (file) {
            event.preventDefault()
            uploadPastedImage(workspaceId, noteId, file)
              .then((embed) => {
                const mainSel = view.state.selection.main
                view.dispatch({
                  changes: { from: mainSel.from, to: mainSel.to, insert: embed },
                  selection: { anchor: mainSel.from + embed.length }
                })
              })
              .catch((err) => {
                console.error('Image paste failed:', err)
              })
            return true
          }
        }
        if (onPaste) {
          onPaste(event)
        }
        return false
      }
    })
  }, [workspaceId, noteId, onPaste])

  const vscodeKeymapExtension = useMemo(() => {
    return keymap.of([
      { key: 'Alt-ArrowUp',           run: moveLineUp },
      { key: 'Alt-ArrowDown',         run: moveLineDown },
      { key: 'Shift-Alt-ArrowUp',     run: copyLineUp },
      { key: 'Shift-Alt-ArrowDown',   run: copyLineDown },
      { key: 'Mod-/',                 run: toggleComment },
      // Multiple cursors
      { key: 'Mod-d',                 run: selectNextOccurrence },
      { key: 'Mod-Shift-l',           run: selectSelectionMatches },
      ...searchKeymap
    ])
  }, [])

  const minimapExtension = useMemo(() => {
    if (!showMinimap) return []
    return minimapFacet.of({
      create: () => {
        const dom = document.createElement('div')
        return { dom }
      }
    })
  }, [showMinimap])

  const extensions = useMemo(() => {
    return [
      ...baseExtensions,
      fontTheme,
      chromeTheme,
      autocompleteExtension,
      domEventHandlers,
      vscodeKeymapExtension,
      minimapExtension
    ]
  }, [fontTheme, autocompleteExtension, domEventHandlers, vscodeKeymapExtension, minimapExtension])

  function handleUpdate(viewUpdate: MinimalViewUpdate): void {
    if (!onSelectionChange || !viewUpdate.selectionSet) return
    const { from, to } = viewUpdate.state.selection.main
    onSelectionChange({ text: viewUpdate.state.sliceDoc(from, to), from, to })
  }

  return (
    <CodeMirror
      ref={editorRef}
      value={value}
      onChange={onChange}
      onUpdate={handleUpdate}
      theme={isLightTheme(settings?.theme) ? 'light' : 'dark'}
      height="100%"
      extensions={extensions}
      basicSetup={{
        foldGutter: false,
        dropCursor: true,
        allowMultipleSelections: true,
        indentOnInput: true,
        bracketMatching: true,
        closeBrackets: true,
        autocompletion: true,
        highlightActiveLine: true,
        highlightSelectionMatches: true
      }}
      className="h-full"
    />
  )
}

export default MarkdownEditor
