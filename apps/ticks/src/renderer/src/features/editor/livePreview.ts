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

class CheckboxWidget extends WidgetType {
  constructor(
    readonly checked: boolean,
    readonly pos: number,
    readonly view: EditorView
  ) {
    super()
  }

  eq(other: CheckboxWidget) {
    return this.checked === other.checked && this.pos === other.pos
  }

  toDOM() {
    const wrap = document.createElement('span')
    wrap.className = 'cm-checkbox-widget'
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.checked = this.checked
    input.className = 'h-3.5 w-3.5 rounded border-neutral-700 bg-neutral-900 text-violet-500 focus:ring-violet-500 focus:ring-offset-neutral-950'
    input.style.cursor = 'pointer'
    input.style.marginRight = '8px'
    input.style.verticalAlign = 'middle'
    
    input.onmousedown = (e) => {
      e.preventDefault() // Prevent grabbing focus from editor
    }
    input.onclick = (e) => {
      e.preventDefault()
      const newText = this.checked ? '[ ]' : '[x]'
      this.view.dispatch({
        changes: { from: this.pos, to: this.pos + 3, insert: newText }
      })
    }
    
    wrap.appendChild(input)
    return wrap
  }
}

class TableWidget extends WidgetType {
  constructor(readonly text: string) {
    super()
  }

  eq(other: TableWidget) {
    return this.text === other.text
  }

  toDOM() {
    const wrap = document.createElement('div')
    wrap.className = 'cm-table-widget prose prose-invert prose-sm max-w-none my-4 overflow-x-auto'
    const table = document.createElement('table')
    table.style.width = 'max-content'
    table.style.minWidth = '100%'
    const lines = this.text.trim().split('\n')
    let isHead = true
    const thead = document.createElement('thead')
    const tbody = document.createElement('tbody')
    table.appendChild(thead)
    table.appendChild(tbody)

    for (const line of lines) {
      if (line.match(/^[\s|:-]+$/)) {
        isHead = false
        continue
      }
      const cells = line.split('|').map(s => s.trim()).filter((_, i, arr) => {
         if ((i === 0 || i === arr.length - 1) && _ === '') return false;
         return true;
      })
      if (cells.length === 0) continue

      const tr = document.createElement('tr')
      for (const cellText of cells) {
        const cell = document.createElement(isHead ? 'th' : 'td')
        cell.textContent = cellText
        tr.appendChild(cell)
      }
      if (isHead) thead.appendChild(tr)
      else tbody.appendChild(tr)
    }
    wrap.appendChild(table)
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
          } else if (node.name === 'TaskMarker') {
            const line = view.state.doc.lineAt(node.from).number
            if (!activeLines.has(line)) {
              const text = view.state.sliceDoc(node.from, node.to)
              const checked = text.includes('x') || text.includes('X')
              const widget = Decoration.replace({
                widget: new CheckboxWidget(checked, node.from, view),
                block: false
              })
              builder.add(node.from, node.to, widget)
            }
          } else if (node.name === 'Table') {
            let isActive = false
            const startLine = view.state.doc.lineAt(node.from).number
            const endLine = view.state.doc.lineAt(node.to).number
            for (let i = startLine; i <= endLine; i++) {
              if (activeLines.has(i)) isActive = true
            }
            if (!isActive) {
              const text = view.state.sliceDoc(node.from, node.to)
              const widget = Decoration.replace({
                widget: new TableWidget(text),
                block: true
              })
              builder.add(node.from, node.to, widget)
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
