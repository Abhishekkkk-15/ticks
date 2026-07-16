import { EditorState } from '@codemirror/state'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { GFM } from '@lezer/markdown'
import { syntaxTree } from '@codemirror/language'

const state = EditorState.create({
  doc: '- [ ] Todo\n- Bullet\n\n> Quote\n\n| a | b |\n|---|---|\n| 1 | 2 |\n',
  extensions: [markdown({ codeLanguages: [], extensions: [GFM] })]
})

let found = []
syntaxTree(state).iterate({
  enter(node) {
    found.push(node.name)
  }
})
console.log(found.join(', '))
