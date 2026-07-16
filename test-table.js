const { JSDOM } = require('jsdom');
const dom = new JSDOM();
const document = dom.window.document;

class TableWidget {
  constructor(text) { this.text = text; }
  toDOM() {
    const wrap = document.createElement('div')
    wrap.className = 'cm-table-widget overflow-x-auto my-4'
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

const w = new TableWidget("| a | b |\n|---|---|\n| 1 | 2 |");
console.log(w.toDOM().outerHTML);
