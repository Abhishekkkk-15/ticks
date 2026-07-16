import { Decoration, DecorationSet, EditorView, WidgetType } from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'
import { RangeSetBuilder, StateField, EditorState } from '@codemirror/state'

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
    readonly pos: number
  ) {
    super()
  }

  eq(other: CheckboxWidget) {
    return this.checked === other.checked && this.pos === other.pos
  }

  toDOM(view: EditorView) {
    const wrap = document.createElement('span')
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.checked = this.checked
    checkbox.className = 'mr-2 cursor-pointer rounded border-neutral-600 bg-neutral-800 accent-amber-500'
    checkbox.onmousedown = (e) => {
      e.preventDefault()
      const newText = this.checked ? '[ ]' : '[x]'
      view.dispatch({
        changes: { from: this.pos, to: this.pos + 3, insert: newText }
      })
    }
    
    wrap.appendChild(checkbox)
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
    wrap.className = 'cm-table-widget overflow-x-auto my-4'
    wrap.style.display = 'inline-block'
    wrap.style.width = '100%'
    const table = document.createElement('table')
    table.style.width = 'max-content'
    table.style.minWidth = '100%'
    table.style.borderCollapse = 'collapse'
    table.style.fontSize = '0.875rem' // text-sm
    
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
        cell.style.borderBottom = '1px solid var(--color-neutral-700)'
        cell.style.padding = '8px 16px'
        if (isHead) {
          cell.style.fontWeight = '600'
          cell.style.textAlign = 'left'
        }
        tr.appendChild(cell)
      }
      if (isHead) thead.appendChild(tr)
      else tbody.appendChild(tr)
    }
    wrap.appendChild(table)
    return wrap
  }
}

class BulletWidget extends WidgetType {
  toDOM() {
    const span = document.createElement('span')
    span.className = 'mr-2 inline-block h-1.5 w-1.5 rounded-full bg-neutral-400 align-middle'
    return span
  }
}

class QuoteWidget extends WidgetType {
  toDOM() {
    const span = document.createElement('span')
    span.className = 'cm-quote-widget'
    span.style.borderLeft = '4px solid var(--color-neutral-500)'
    span.style.paddingRight = '12px'
    span.style.marginLeft = '4px'
    span.style.display = 'inline-block'
    span.style.height = '1.2em'
    span.style.verticalAlign = 'middle'
    return span
  }
}

class HTMLWidget extends WidgetType {
  constructor(readonly html: string) {
    super()
  }
  eq(other: HTMLWidget) {
    return this.html === other.html
  }
  toDOM() {
    const div = document.createElement('div')
    div.className = 'cm-html-widget overflow-x-auto my-4'
    div.style.display = 'inline-block'
    div.style.width = '100%'
    div.innerHTML = this.html
    return div
  }
}

function buildDecorations(state: EditorState) {
  const builder = new RangeSetBuilder<Decoration>()
  const activeLines = new Set<number>()
  for (const range of state.selection.ranges) {
    const startLine = state.doc.lineAt(range.from).number
    const endLine = state.doc.lineAt(range.to).number
    for (let i = startLine; i <= endLine; i++) {
      activeLines.add(i)
    }
  }

  syntaxTree(state).iterate({
    from: 0,
    to: state.doc.length,
    enter: (node) => {
      if (MARKER_NODES.has(node.name)) {
        const line = state.doc.lineAt(node.from).number
        if (!activeLines.has(line)) {
          builder.add(node.from, node.to, hideDecoration)
        }
      } else if (node.name === 'ListMark') {
        const line = state.doc.lineAt(node.from).number
        if (!activeLines.has(line)) {
          const text = state.sliceDoc(node.from, node.to)
          if (text === '-' || text === '*' || text === '+') {
            const widget = Decoration.replace({ widget: new BulletWidget() })
            builder.add(node.from, node.to, widget)
          }
        }
      } else if (node.name === 'QuoteMark') {
        const line = state.doc.lineAt(node.from).number
        if (!activeLines.has(line)) {
          const widget = Decoration.replace({ widget: new QuoteWidget() })
          builder.add(node.from, node.to, widget)
        }
      } else if (node.name === 'Image') {
        const line = state.doc.lineAt(node.from).number
        if (!activeLines.has(line)) {
          const imageText = state.sliceDoc(node.from, node.to)
          const match = imageText.match(/^!\[(.*?)\]\((.*?)\)$/)
          if (match) {
            const altText = match[1]
            const url = match[2]
            if (!url.startsWith('drawing://')) {
              const widget = Decoration.replace({
                widget: new ImageWidget(url, altText)
              })
              builder.add(node.from, node.to, widget)
              return false
            }
          }
        }
      } else if (node.name === 'TaskMarker') {
        const line = state.doc.lineAt(node.from).number
        if (!activeLines.has(line)) {
          const text = state.sliceDoc(node.from, node.to)
          const checked = text.includes('x') || text.includes('X')
          const widget = Decoration.replace({
            widget: new CheckboxWidget(checked, node.from)
          })
          builder.add(node.from, node.to, widget)
          return false
        }
      } else if (node.name === 'Table') {
        let isActive = false
        const startLine = state.doc.lineAt(node.from).number
        const endLine = state.doc.lineAt(node.to).number
        for (let i = startLine; i <= endLine; i++) {
          if (activeLines.has(i)) isActive = true
        }
        if (!isActive) {
          const from = state.doc.line(startLine).from
          const to = state.doc.line(endLine).to
          const text = state.sliceDoc(from, to)
          const widget = Decoration.replace({
            widget: new TableWidget(text),
            block: true
          })
          builder.add(from, to, widget)
          return false
        }
      } else if (node.name === 'HTMLBlock') {
        let isActive = false
        const startLine = state.doc.lineAt(node.from).number
        const endLine = state.doc.lineAt(node.to).number
        for (let i = startLine; i <= endLine; i++) {
          if (activeLines.has(i)) isActive = true
        }
        if (!isActive) {
          const from = state.doc.line(startLine).from
          const to = state.doc.line(endLine).to
          const text = state.sliceDoc(from, to)
          const widget = Decoration.replace({
            widget: new HTMLWidget(text),
            block: true
          })
          builder.add(from, to, widget)
          return false
        }
      }
      return true
    }
  })
  
  return builder.finish()
}

export const livePreviewPlugin = StateField.define<DecorationSet>({
  create(state) {
    return buildDecorations(state)
  },
  update(decos, tr) {
    if (tr.docChanged || tr.selection) {
      return buildDecorations(tr.state)
    }
    return decos
  },
  provide: f => EditorView.decorations.from(f)
})
