import { useMemo } from 'react'
import CodeMirror, { EditorView } from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { markdownKeymapExtension } from './markdownShortcuts'
import { useSettings } from '../settings/SettingsContext'

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
}

const baseExtensions = [markdown({ codeLanguages: languages }), markdownKeymapExtension]

function MarkdownEditor({
  value,
  onChange,
  onSelectionChange
}: MarkdownEditorProps): React.JSX.Element {
  const { settings } = useSettings()

  const fontTheme = useMemo(() => {
    const font = settings?.editor_font || 'monospace'
    const size = settings?.font_size || 14
    return EditorView.theme({
      '&.cm-editor': {
        fontSize: `${size}px`,
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
    return [...baseExtensions, fontTheme]
  }, [fontTheme])

  function handleUpdate(viewUpdate: MinimalViewUpdate): void {
    if (!onSelectionChange || !viewUpdate.selectionSet) return
    const { from, to } = viewUpdate.state.selection.main
    onSelectionChange({ text: viewUpdate.state.sliceDoc(from, to), from, to })
  }

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      onUpdate={handleUpdate}
      theme={settings?.theme === 'light' ? 'light' : 'dark'}
      height="100%"
      extensions={extensions}
      basicSetup={{ foldGutter: false }}
      className="h-full"
    />
  )
}

export default MarkdownEditor
