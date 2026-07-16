import { ViewPlugin, Decoration, DecorationSet, EditorView, ViewUpdate, WidgetType } from '@codemirror/view'
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

class ImageWidget extends WidgetType {
  constructor(
    readonly url: string,
    readonly altText: string
  ) {
    super()
  }

  eq(other: ImageWidget) {
    return this.url === other.url && this.altText === other.altText
  }

  toDOM() {
    const wrap = document.createElement('span')
    wrap.className = 'cm-image-widget'
    const img = document.createElement('img')
    img.src = this.url
    img.alt = this.altText
    img.style.maxWidth = '100%'
    img.style.maxHeight = '400px'
    img.style.display = 'block'
    img.style.margin = '10px auto'
    img.style.borderRadius = '8px'
    img.style.border = '1px solid var(--color-neutral-800)'
    img.style.backgroundColor = 'var(--color-neutral-900)'
    img.style.cursor = 'pointer'
    
    // Fallback if image fails to load
    img.onerror = () => {
      img.style.display = 'none'
      const err = document.createElement('span')
      err.textContent = `[Image broken: ${this.altText || this.url}]`
      err.className = 'text-red-400 text-xs italic'
      wrap.appendChild(err)
    }

    wrap.appendChild(img)
    return wrap
  }
}

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
          } else if (node.name === 'Image') {
            const line = view.state.doc.lineAt(node.from).number
            if (!activeLines.has(line)) {
              // Extract the URL and Alt text
              const imageText = view.state.sliceDoc(node.from, node.to)
              // Basic regex to pull out ![alt](url)
              const match = imageText.match(/^!\[(.*?)\]\((.*?)\)$/)
              if (match) {
                const altText = match[1]
                const url = match[2]
                // Only replace if it's a standard URL or app scheme, skip drawings for now
                if (!url.startsWith('drawing://')) {
                  const widget = Decoration.replace({
                    widget: new ImageWidget(url, altText),
                    block: false
                  })
                  builder.add(node.from, node.to, widget)
                }
              }
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
