import { useMemo, useRef, useEffect } from 'react'
import type { Ref } from 'react'
import CodeMirror, { EditorView } from '@uiw/react-codemirror'
import type { ReactCodeMirrorRef } from '@uiw/react-codemirror'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { startCompletion, type CompletionContext } from '@codemirror/autocomplete'
import { syntaxHighlighting, HighlightStyle } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'
import { keymap } from '@codemirror/view'
import { moveLineUp, moveLineDown, copyLineUp, copyLineDown, toggleComment } from '@codemirror/commands'
import { searchKeymap, selectNextOccurrence, selectSelectionMatches } from '@codemirror/search'
import { showMinimap as minimapFacet } from '@replit/codemirror-minimap'
import { markdownKeymapExtension } from './markdownShortcuts'
import { useSettings } from '../settings/SettingsContext'
import { isLightTheme } from '../settings/themeUtils'
import { getClipboardImageFile, uploadPastedImage } from '../notes/pasteImage'
import { livePreviewPlugin } from './livePreview'

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
  }),
  EditorView.lineWrapping
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

const livePreviewHighlighting = syntaxHighlighting(
  HighlightStyle.define([
    { tag: t.heading1, fontSize: '2.1em', fontWeight: 'bold' },
    { tag: t.heading2, fontSize: '1.6em', fontWeight: 'bold' },
    { tag: t.heading3, fontSize: '1.3em', fontWeight: 'bold' },
    { tag: t.heading4, fontSize: '1.1em', fontWeight: 'bold' },
    { tag: t.heading5, fontSize: '1em', fontWeight: 'bold' },
    { tag: t.heading6, fontSize: '0.9em', fontWeight: 'bold' },
    { tag: t.strong, fontWeight: 'bold' },
    { tag: t.emphasis, fontStyle: 'italic' },
    { tag: t.strikethrough, textDecoration: 'line-through' },
    { 
      tag: t.monospace,
      backgroundColor: 'var(--color-neutral-800)',
      borderRadius: '4px',
      padding: '2px 4px',
      fontFamily: 'monospace'
    }
  ])
)

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

  const notesRef = useRef(notes)
  useEffect(() => {
    notesRef.current = notes
  }, [notes])

  const autocompleteExtension = useMemo(() => {
    const getSlashOptions = (triggerPos: number) => {
      return [
        { label: 'Heading 1', type: 'text', insertText: '# ' },
        { label: 'Heading 2', type: 'text', insertText: '## ' },
        { label: 'Heading 3', type: 'text', insertText: '### ' },
        { label: 'Task List', type: 'text', insertText: '- [ ] ' },
        { label: 'Bullet List', type: 'text', insertText: '- ' },
        { label: 'Numbered List', type: 'text', insertText: '1. ' },
        { label: 'Code Block', type: 'text', insertText: '```\n\n```', cursorOffset: -4 },
        { label: 'Math Block', type: 'text', insertText: '$$\n\n$$', cursorOffset: -3 },
        { label: 'Quote', type: 'text', insertText: '> ' },
        { label: 'Horizontal Rule', type: 'text', insertText: '---\n' },
        { label: 'Table', type: 'text', insertText: '| Column 1 | Column 2 |\n| -------- | -------- |\n| Text     | Text     |' },
        { label: 'Bold', type: 'text', insertText: '****', cursorOffset: -2 },
        { label: 'Italic', type: 'text', insertText: '**', cursorOffset: -1 },
        { label: 'Strikethrough', type: 'text', insertText: '~~~~', cursorOffset: -2 },
        { label: 'Link', type: 'text', insertText: '[]()', cursorOffset: -3 },
        { label: 'Image', type: 'text', insertText: '![]()', cursorOffset: -3 },
        { label: 'Inline Code', type: 'text', insertText: '``', cursorOffset: -1 },
        { label: 'Highlight', type: 'text', insertText: '====', cursorOffset: -2 },
        { label: 'Callout (Info)', type: 'text', insertText: '> [!info]\n> ' },
        { label: 'Mermaid Diagram', type: 'text', insertText: '```mermaid\ngraph TD;\n    A-->B;\n```\n' },
        { label: 'Toggle / Accordion', type: 'text', insertText: '<details>\n  <summary>Title</summary>\n  Content\n</details>', cursorOffset: -10 },
        { label: 'Frontmatter', type: 'text', insertText: '---\ntitle: \n---\n', cursorOffset: -5 },
        { label: 'Footnote', type: 'text', insertText: '[^1]', cursorOffset: -1 },
        { label: "Today's Date", type: 'text', insertText: () => new Date().toISOString().split('T')[0] },
        { label: 'Current Time', type: 'text', insertText: () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ].map((opt: any) => ({
        label: opt.label,
        type: opt.type,
        apply: (view: EditorView, _completion: any, _from: number, to: number) => {
          const text = typeof opt.insertText === 'function' ? opt.insertText() : opt.insertText
          view.dispatch({
            changes: { from: triggerPos, to, insert: text },
            selection: opt.cursorOffset ? { anchor: triggerPos + text.length + opt.cursorOffset } : undefined
          })
        }
      }))
    }

    return markdownLanguage.data.of({
      autocomplete: (context: CompletionContext) => {
        const wikiWord = context.matchBefore(/\[\[[^\]]*$/)
        if (wikiWord) {
          const currentNotes = notesRef.current
          if (!currentNotes || currentNotes.length === 0) {
            return {
              from: wikiWord.from + 2,
              options: [{
                label: 'Loading notes...',
                type: 'keyword',
                apply: () => {}
              }]
            }
          }

          return {
            from: wikiWord.from + 2,
            options: currentNotes.map((note) => ({
              label: note.title,
              displayLabel: note.title,
              type: 'keyword',
              apply: (view, _completion, _from, to) => {
                let end = to
                const nextChars = view.state.sliceDoc(to, to + 2)
                if (nextChars === ']]') {
                  end = to + 2
                }
                const insertText = `[${note.title}](note://${note.id})`
                view.dispatch({
                  changes: { from: wikiWord.from, to: end, insert: insertText },
                  selection: { anchor: wikiWord.from + insertText.length }
                })
              }
            }))
          }
        }

        const slashWord = context.matchBefore(/\/\w*$/)
        if (slashWord) {
          return {
            from: slashWord.from + 1,
            options: getSlashOptions(slashWord.from)
          }
        }

        if (context.explicit) {
          return {
            from: context.pos,
            options: getSlashOptions(context.pos)
          }
        }

        return null
      }
    })
  }, [])

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
      { key: 'Shift-Space',           run: startCompletion },
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

  const autoTriggerExtension = useMemo(() => {
    return EditorView.updateListener.of((update) => {
      if (
        update.docChanged &&
        update.transactions.some((tr) => tr.isUserEvent('input.type'))
      ) {
        const view = update.view
        const { main } = view.state.selection
        if (main.empty) {
          const textBefore = view.state.sliceDoc(Math.max(0, main.head - 2), main.head)
          
          if (textBefore === '[[') {
            setTimeout(() => {
              startCompletion(view)
            }, 0)
          } else if (textBefore.endsWith('/')) {
            setTimeout(() => {
              startCompletion(view)
            }, 0)
          }
        }
      }
    })
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
      autoTriggerExtension,
      minimapExtension,
      ...(settings?.live_preview ? [livePreviewPlugin, livePreviewHighlighting] : [])
    ]
  }, [fontTheme, autocompleteExtension, domEventHandlers, vscodeKeymapExtension, autoTriggerExtension, minimapExtension, settings?.live_preview])

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
