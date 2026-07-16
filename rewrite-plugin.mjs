import fs from 'fs'

const code = fs.readFileSync('apps/ticks/src/renderer/src/features/editor/livePreview.ts', 'utf-8')

let newCode = code.replace(
  "import { RangeSetBuilder } from '@codemirror/state'",
  "import { RangeSetBuilder, StateField, EditorState } from '@codemirror/state'"
)

newCode = newCode.replace(
  "constructor(readonly checked: boolean, readonly pos: number, readonly view: EditorView) {",
  "constructor(readonly checked: boolean, readonly pos: number) {"
)

newCode = newCode.replace(
  "toDOM() {",
  "toDOM(view: EditorView) {"
)

// Wait, I should just write a script to replace the entire bottom half of the file.
