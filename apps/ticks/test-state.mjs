import { EditorState } from '@codemirror/state';
import { autocompletion, currentCompletions, startCompletion } from '@codemirror/autocomplete';

const notes = [{ id: '1', title: 'Test Note' }];

const autocompleteExtension = autocompletion({
  override: [
    (context) => {
      const word = context.matchBefore(/\[\[[^\]]*$/);
      if (!word) return null;
      return {
        from: word.from,
        options: notes.map((note) => ({
          label: note.title,
          type: 'keyword',
          apply: () => {}
        }))
      };
    }
  ]
});

const state = EditorState.create({
  doc: '[[]]',
  selection: { anchor: 2 },
  extensions: [autocompleteExtension]
});

// We need a view for startCompletion, but we can't easily mock it without DOM.
// But we can check if the source resolves.
const context = {
  state,
  pos: 2,
  explicit: true,
  matchBefore(re) {
    const text = state.sliceDoc(0, this.pos);
    const match = text.match(new RegExp(re.source + '(?=$)'));
    if (!match) return null;
    return { from: this.pos - match[0].length, to: this.pos, text: match[0] };
  }
};

const word = context.matchBefore(/\[\[[^\]]*$/);
console.log('word matches:', word);
