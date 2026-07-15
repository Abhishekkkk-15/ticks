import { EditorView } from '@uiw/react-codemirror'

export interface FormatAction {
  id: string
  label: string
  shortcut?: string
  run: (view: EditorView) => boolean
}

function getSelectedLineRange(view: EditorView): { fromLine: number; toLine: number } {
  const { from, to } = view.state.selection.main
  return {
    fromLine: view.state.doc.lineAt(from).number,
    toLine: view.state.doc.lineAt(to).number
  }
}

// Applies `transform` to every line spanned by the current selection, as a
// single undoable transaction.
function mapSelectedLines(view: EditorView, transform: (text: string) => string): boolean {
  const { fromLine, toLine } = getSelectedLineRange(view)
  const changes: { from: number; to: number; insert: string }[] = []

  for (let n = fromLine; n <= toLine; n++) {
    const line = view.state.doc.line(n)
    const newText = transform(line.text)
    if (newText !== line.text) {
      changes.push({ from: line.from, to: line.to, insert: newText })
    }
  }

  if (changes.length > 0) {
    view.dispatch({ changes, scrollIntoView: true })
  }
  return true
}

const HEADING_RE = /^(#{1,6})\s+/
const CHECKLIST_RE = /^-\s+\[[ xX]\]\s+/
const BULLET_RE = /^-\s+/
const ORDERED_RE = /^\d+\.\s+/
const QUOTE_RE = /^>\s+/

function stripLinePrefix(text: string): string {
  if (CHECKLIST_RE.test(text)) return text.replace(CHECKLIST_RE, '')
  if (HEADING_RE.test(text)) return text.replace(HEADING_RE, '')
  if (ORDERED_RE.test(text)) return text.replace(ORDERED_RE, '')
  if (QUOTE_RE.test(text)) return text.replace(QUOTE_RE, '')
  if (BULLET_RE.test(text)) return text.replace(BULLET_RE, '')
  return text
}

// Wraps the selection with a symmetric marker (bold/italic/strikethrough/
// inline code); wraps back off if the selection is already wrapped.
function wrapInline(marker: string) {
  return (view: EditorView): boolean => {
    const range = view.state.selection.main
    const selectedText = view.state.sliceDoc(range.from, range.to)

    const alreadyWrapped =
      selectedText.length >= marker.length * 2 &&
      selectedText.startsWith(marker) &&
      selectedText.endsWith(marker)

    if (alreadyWrapped) {
      const inner = selectedText.slice(marker.length, selectedText.length - marker.length)
      view.dispatch({
        changes: { from: range.from, to: range.to, insert: inner },
        selection: { anchor: range.from, head: range.from + inner.length },
        scrollIntoView: true
      })
      return true
    }

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

// Wraps the selection with asymmetric tags (e.g., <mark> and </mark>)
function wrapTags(openTag: string, closeTag: string) {
  return (view: EditorView): boolean => {
    const range = view.state.selection.main
    const selectedText = view.state.sliceDoc(range.from, range.to)

    const alreadyWrapped =
      selectedText.length >= openTag.length + closeTag.length &&
      selectedText.startsWith(openTag) &&
      selectedText.endsWith(closeTag)

    if (alreadyWrapped) {
      const inner = selectedText.slice(openTag.length, selectedText.length - closeTag.length)
      view.dispatch({
        changes: { from: range.from, to: range.to, insert: inner },
        selection: { anchor: range.from, head: range.from + inner.length },
        scrollIntoView: true
      })
      return true
    }

    view.dispatch({
      changes: { from: range.from, to: range.to, insert: `${openTag}${selectedText}${closeTag}` },
      selection: {
        anchor: range.from + openTag.length,
        head: range.from + openTag.length + selectedText.length
      },
      scrollIntoView: true
    })
    return true
  }
}

function toggleHeading(level: number) {
  const prefix = `${'#'.repeat(level)} `
  return (view: EditorView): boolean =>
    mapSelectedLines(view, (text) => {
      const match = text.match(HEADING_RE)
      const isSameLevel = Boolean(match && match[1].length === level)
      const stripped = stripLinePrefix(text)
      return isSameLevel ? stripped : prefix + stripped
    })
}

function toggleBulletList(view: EditorView): boolean {
  return mapSelectedLines(view, (text) => {
    if (BULLET_RE.test(text) && !CHECKLIST_RE.test(text)) return stripLinePrefix(text)
    return `- ${stripLinePrefix(text)}`
  })
}

function toggleOrderedList(view: EditorView): boolean {
  return mapSelectedLines(view, (text) => {
    if (ORDERED_RE.test(text)) return stripLinePrefix(text)
    return `1. ${stripLinePrefix(text)}`
  })
}

function toggleChecklist(view: EditorView): boolean {
  return mapSelectedLines(view, (text) => {
    if (CHECKLIST_RE.test(text)) return stripLinePrefix(text)
    return `- [ ] ${stripLinePrefix(text)}`
  })
}

function toggleBlockquote(view: EditorView): boolean {
  return mapSelectedLines(view, (text) => {
    if (QUOTE_RE.test(text)) return stripLinePrefix(text)
    return `> ${stripLinePrefix(text)}`
  })
}

function insertLink(view: EditorView): boolean {
  const range = view.state.selection.main
  const selectedText = view.state.sliceDoc(range.from, range.to)
  const linkText = selectedText || 'text'
  const urlPlaceholder = 'url'
  const insert = `[${linkText}](${urlPlaceholder})`
  const urlStart = range.from + 1 + linkText.length + 2
  const urlEnd = urlStart + urlPlaceholder.length

  view.dispatch({
    changes: { from: range.from, to: range.to, insert },
    selection: { anchor: urlStart, head: urlEnd },
    scrollIntoView: true
  })
  return true
}

function toggleCodeBlock(view: EditorView): boolean {
  const range = view.state.selection.main
  const selectedText = view.state.sliceDoc(range.from, range.to)
  const fence = '```'

  if (!selectedText) {
    const insert = `${fence}\n\n${fence}`
    view.dispatch({
      changes: { from: range.from, to: range.to, insert },
      selection: { anchor: range.from + fence.length + 1 },
      scrollIntoView: true
    })
    return true
  }

  const insert = `${fence}\n${selectedText}\n${fence}`
  view.dispatch({
    changes: { from: range.from, to: range.to, insert },
    selection: { anchor: range.from, head: range.from + insert.length },
    scrollIntoView: true
  })
  return true
}

export const formatActions: FormatAction[] = [
  { id: 'bold', label: 'Bold', shortcut: 'Ctrl+B', run: wrapInline('**') },
  { id: 'italic', label: 'Italic', shortcut: 'Ctrl+I', run: wrapInline('*') },
  { id: 'strikethrough', label: 'Strikethrough', shortcut: 'Ctrl+Shift+X', run: wrapInline('~~') },
  { id: 'highlight', label: 'Highlight', shortcut: 'Ctrl+Shift+H', run: wrapTags('<mark>', '</mark>') },
  { id: 'code', label: 'Inline code', shortcut: 'Ctrl+Shift+M', run: wrapInline('`') },
  { id: 'h1', label: 'Heading 1', shortcut: 'Ctrl+1', run: toggleHeading(1) },
  { id: 'h2', label: 'Heading 2', shortcut: 'Ctrl+2', run: toggleHeading(2) },
  { id: 'h3', label: 'Heading 3', shortcut: 'Ctrl+3', run: toggleHeading(3) },
  { id: 'bulletList', label: 'Bullet list', shortcut: 'Ctrl+Shift+8', run: toggleBulletList },
  { id: 'orderedList', label: 'Numbered list', shortcut: 'Ctrl+Shift+7', run: toggleOrderedList },
  { id: 'checklist', label: 'Checklist', shortcut: 'Ctrl+Shift+C', run: toggleChecklist },
  { id: 'blockquote', label: 'Quote', shortcut: 'Ctrl+Shift+9', run: toggleBlockquote },
  { id: 'link', label: 'Link', shortcut: 'Ctrl+K', run: insertLink },
  { id: 'codeBlock', label: 'Code block', shortcut: 'Ctrl+Shift+K', run: toggleCodeBlock }
]
