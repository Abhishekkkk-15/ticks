import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { markdown } from '@codemirror/lang-markdown'
import { GFM } from '@lezer/markdown'
import { livePreviewPlugin } from './apps/ticks/src/renderer/src/features/editor/livePreview.ts'
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!DOCTYPE html><div id="editor"></div>')
global.window = dom.window
global.document = dom.window.document

const state = EditorState.create({
  doc: '- [ ] Todo\n- Bullet **bold**\n\n> Quote\n\n| a | b |\n|---|---|\n| **1** | 2 |\n',
  extensions: [markdown({ extensions: [GFM] }), livePreviewPlugin]
})

try {
  const view = new EditorView({
    state,
    parent: document.getElementById('editor')
  })
  console.log("No crash!")
} catch (e) {
  console.log("CRASH:", e)
}
