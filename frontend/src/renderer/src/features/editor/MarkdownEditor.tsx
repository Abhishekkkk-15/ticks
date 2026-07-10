import CodeMirror from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { markdownKeymapExtension } from './markdownShortcuts'

export interface EditorSelection {
  text: string
  from: number
  to: number
}

// Structurally typed against CodeMirror's real ViewUpdate (only the fields
// this component reads) instead of importing @codemirror/view directly —
// it isn't a direct dependency of this project, only a peer of
// @uiw/react-codemirror, and the real object passed at runtime satisfies
// this shape regardless.
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

const extensions = [markdown({ codeLanguages: languages }), markdownKeymapExtension]

function MarkdownEditor({
  value,
  onChange,
  onSelectionChange
}: MarkdownEditorProps): React.JSX.Element {
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
      theme="dark"
      height="100%"
      extensions={extensions}
      basicSetup={{ foldGutter: false }}
      className="h-full text-sm"
    />
  )
}

export default MarkdownEditor
