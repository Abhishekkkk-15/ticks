import { useMemo } from 'react'
import type { Ref } from 'react'
import CodeMirror, { EditorView } from '@uiw/react-codemirror'
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { markdownKeymapExtension } from './markdownShortcuts'
import { useSettings } from '../settings/SettingsContext'
import { isLightTheme } from '../settings/themeUtils'

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
}

const baseExtensions = [markdown({ codeLanguages: languages }), markdownKeymapExtension]

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
  editorRef
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

  const extensions = useMemo(() => {
    return [...baseExtensions, fontTheme, chromeTheme]
  }, [fontTheme])

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
      basicSetup={{ foldGutter: false }}
      className="h-full"
    />
  )
}

export default MarkdownEditor
