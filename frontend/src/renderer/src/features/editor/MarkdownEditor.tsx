import CodeMirror from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { markdownKeymapExtension } from './markdownShortcuts'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
}

const extensions = [markdown({ codeLanguages: languages }), markdownKeymapExtension]

function MarkdownEditor({ value, onChange }: MarkdownEditorProps): React.JSX.Element {
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      theme="dark"
      height="100%"
      extensions={extensions}
      basicSetup={{ foldGutter: false }}
      className="h-full text-sm"
    />
  )
}

export default MarkdownEditor
