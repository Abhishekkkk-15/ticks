import type { RefObject } from 'react'
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror'
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Link as LinkIcon,
  Code2,
  Highlighter
} from 'lucide-react'
import { formatActions, type FormatAction } from './formatting'

const icons: Record<string, React.ComponentType<{ size?: number }>> = {
  bold: Bold,
  italic: Italic,
  strikethrough: Strikethrough,
  highlight: Highlighter,
  'highlight-sketch': Highlighter,
  'highlight-error': Highlighter,
  code: Code,
  h1: Heading1,
  h2: Heading2,
  h3: Heading3,
  bulletList: List,
  orderedList: ListOrdered,
  checklist: ListChecks,
  blockquote: Quote,
  link: LinkIcon,
  codeBlock: Code2
}

interface EditorToolbarProps {
  editorRef: RefObject<ReactCodeMirrorRef | null>
}

function EditorToolbar({ editorRef }: EditorToolbarProps): React.JSX.Element {
  function runAction(action: FormatAction): void {
    const view = editorRef.current?.view
    if (!view) return
    action.run(view)
    view.focus()
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-neutral-800 px-2 py-1.5">
      {formatActions.map((action) => {
        const Icon = icons[action.id]
        return (
          <button
            key={action.id}
            type="button"
            title={action.shortcut ? `${action.label} (${action.shortcut})` : action.label}
            onClick={() => runAction(action)}
            className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
          >
            <Icon size={15} />
          </button>
        )
      })}
    </div>
  )
}

export default EditorToolbar
