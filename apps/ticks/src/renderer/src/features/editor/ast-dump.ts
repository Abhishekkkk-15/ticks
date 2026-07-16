import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { EditorState } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'

const state = EditorState.create({
  doc: '- [ ] Todo\n- [x] Done\n\n| a | b |\n|---|---|\n| 1 | 2 |\n',
  extensions: [markdown()]
})

syntaxTree(state).iterate({
  enter(node) {
    console.log(node.name, node.from, node.to, JSON.stringify(state.sliceDoc(node.from, node.to)))
  }
})
