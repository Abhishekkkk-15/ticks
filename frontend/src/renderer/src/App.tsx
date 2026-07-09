import { useState } from 'react'
import AppShell from './components/layout/AppShell'
import EditorView from './features/editor/EditorView'

// Standalone demo doc for the editor milestone — not yet backed by a real
// note file. Wiring this to actual per-workspace notes lands with file storage.
const DEMO_DOCUMENT = `# Getting Started

This is a **demo** document showing off the editor — *headings*, lists, checklists, tables, and code all render live.

## Task list

- [x] Set up the editor
- [ ] Wire it to real notes
- [ ] Ship it

## A table

| Feature | Status |
| --- | --- |
| Live preview | done |
| Split view | done |
| Syntax highlighting | done |

## Code

\`\`\`ts
function greet(name: string): string {
  return \`Hello, \${name}!\`
}
\`\`\`

## An image

![A tiny dot](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=)
`

function App(): React.JSX.Element {
  const [content, setContent] = useState(DEMO_DOCUMENT)

  return (
    <AppShell>
      <EditorView value={content} onChange={setContent} />
    </AppShell>
  )
}

export default App
