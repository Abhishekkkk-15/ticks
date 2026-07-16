import { ViewPlugin, Decoration, DecorationSet, EditorView, ViewUpdate } from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'
import { RangeSetBuilder } from '@codemirror/state'

// The decoration that hides markdown syntax tokens
const hideDecoration = Decoration.replace({})

// The names of the Lezer markdown AST nodes that represent syntax markers we want to hide
const MARKER_NODES = new Set([
  'HeaderMark',
  'EmphasisMark',
  'StrongEmphasisMark',
  'StrikethroughMark'
])

export const livePreviewPlugin = ViewPlugin.fromClass(class {
  decorations: DecorationSet

  constructor(view: EditorView) {
    this.decorations = this.buildDecorations(view)
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged || update.selectionSet) {
      this.decorations = this.buildDecorations(update.view)
    }
  }

  buildDecorations(view: EditorView) {
    const builder = new RangeSetBuilder<Decoration>()
    
    // Determine which lines contain a cursor/selection so we can show syntax there
    const activeLines = new Set<number>()
    for (const range of view.state.selection.ranges) {
      const startLine = view.state.doc.lineAt(range.from).number
      const endLine = view.state.doc.lineAt(range.to).number
      for (let i = startLine; i <= endLine; i++) {
        activeLines.add(i)
      }
    }

    // Iterate through the syntax tree in the visible viewport
    for (const { from, to } of view.visibleRanges) {
      syntaxTree(view.state).iterate({
        from,
        to,
        enter: (node) => {
          // If the node is one of our syntax markers...
          if (MARKER_NODES.has(node.name)) {
            // Check if it's on an active line
            const line = view.state.doc.lineAt(node.from).number
            if (!activeLines.has(line)) {
              // Hide the syntax marker
              builder.add(node.from, node.to, hideDecoration)
            }
          }
        }
      })
    }
    
    return builder.finish()
  }
}, {
  decorations: v => v.decorations
})
