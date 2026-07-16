import { EditorState } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown'
import { syntaxTree } from '@codemirror/language'

const state = EditorState.create({
  doc: '<table>\n<tr><td>1</td></tr>\n</table>\n\n<ul>\n<li>Bullet</li>\n</ul>\n',
  extensions: [markdown()]
})

syntaxTree(state).iterate({
  enter(node) {
    console.log(node.name)
  }
})
