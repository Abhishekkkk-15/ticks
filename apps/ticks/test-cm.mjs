import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!DOCTYPE html><div id="editor"></div>');
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;

import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { autocompletion, startCompletion } from '@codemirror/autocomplete';

const notes = [{ id: '1', title: 'Test Note' }];

const autocompleteExtension = autocompletion({
  override: [
    (context) => {
      const word = context.matchBefore(/\[\[[^\]]*$/);
      console.log('matchBefore word:', word);
      if (!word) return null;
      console.log('Returning options');
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

const autoTriggerExtension = EditorView.updateListener.of((update) => {
  if (
    update.docChanged &&
    update.selectionSet &&
    update.transactions.some((tr) => tr.isUserEvent('input.type'))
  ) {
    const view = update.view;
    const { main } = view.state.selection;
    if (main.empty) {
      const textBefore = view.state.sliceDoc(Math.max(0, main.head - 2), main.head);
      console.log('textBefore typed:', textBefore);
      if (textBefore === '[[') {
        setTimeout(() => {
          console.log('Calling startCompletion');
          startCompletion(view);
        }, 0);
      }
    }
  }
});

const state = EditorState.create({
  doc: 'Hello ',
  extensions: [autocompleteExtension, autoTriggerExtension]
});

const view = new EditorView({
  state,
  parent: document.getElementById('editor')
});

// Simulate typing [[
view.dispatch({
  changes: { from: 6, insert: '[[\]\]' },
  selection: { anchor: 8 },
  userEvent: 'input.type'
});

setTimeout(() => {
  // Let's check if the autocomplete popup is open
  const popup = document.querySelector('.cm-tooltip-autocomplete');
  console.log('Popup exists?', !!popup);
}, 100);

