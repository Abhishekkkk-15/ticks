import { useState } from 'react'
import AppShell from './components/layout/AppShell'
import EditorView from './features/editor/EditorView'
import DrawingView from './features/drawings/DrawingView'

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

type MainView = 'notes' | 'whiteboard'

// Temporary top-level switcher for demoing the editor and whiteboard in
// isolation. Replaced by the real per-note tab system once notes exist.
function App(): React.JSX.Element {
  const [content, setContent] = useState(DEMO_DOCUMENT)
  const [view, setView] = useState<MainView>('notes')

  return (
    <AppShell>
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 items-center gap-1 border-b border-neutral-800 px-3 py-2">
          <button
            type="button"
            onClick={() => setView('notes')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              view === 'notes'
                ? 'bg-neutral-800 text-neutral-100'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            Notes
          </button>
          <button
            type="button"
            onClick={() => setView('whiteboard')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              view === 'whiteboard'
                ? 'bg-neutral-800 text-neutral-100'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            Whiteboard
          </button>
        </div>
        <div className="min-h-0 flex-1">
          {view === 'notes' ? (
            <EditorView value={content} onChange={setContent} />
          ) : (
            <DrawingView />
          )}
        </div>
      </div>
    </AppShell>
  )
}

export default App
