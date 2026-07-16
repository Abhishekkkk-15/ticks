import { JSDOM } from 'jsdom'
const dom = new JSDOM('<!DOCTYPE html><div id="editor"></div>')
global.window = dom.window
global.document = dom.window.document

import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { markdown } from '@codemirror/lang-markdown'
import { GFM } from '@lezer/markdown'
import { livePreviewPlugin } from './apps/ticks/src/renderer/src/features/editor/livePreview.ts'

const state = EditorState.create({
  doc: '<table>\n<tr><td>1</td></tr>\n</table>\n\nSome <b>bold</b> text.\n',
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
