const { EditorState, StateEffect } = require('@codemirror/state');
const { autocompletion, startCompletion, currentCompletions } = require('@codemirror/autocomplete');
const { markdownLanguage } = require('@codemirror/lang-markdown');

const notes = [{ title: 'My Test Note', id: '1' }];

const autocompleteExtension = autocompletion({
  override: [
    (context) => {
      const wikiWord = context.matchBefore(/\[\[[^\]]*$/);
      if (wikiWord) {
        return {
          from: wikiWord.from + 2,
          options: notes.map((note) => ({
            label: note.title,
            type: 'keyword',
          }))
        };
      }
      
      const slashWord = context.matchBefore(/\/\w*$/);
      if (slashWord) {
        return {
          from: slashWord.from + 1,
          options: [
            { label: 'Heading 1', type: 'text', insertText: '# ' },
          ].map(opt => ({
            label: opt.label,
            type: opt.type,
          }))
        };
      }

      return null;
    }
  ]
});

let state = EditorState.create({
  doc: "Hello /",
  selection: { anchor: 7 },
  extensions: [
    autocompleteExtension
  ]
});

// Trigger completion explicitly
state = state.update({ effects: [
  // Dispatch a dummy effect to trigger a state update that startCompletion would do
  // Actually, startCompletion(view) operates on the view. We can just use the state directly?
  // startCompletion is a Command, it takes an EditorView.
] }).state;

// We need a dummy view to run the command!
const { EditorView } = require('@codemirror/view');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="editor"></div></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.navigator = dom.window.navigator;

const view = new EditorView({
  state,
  parent: document.getElementById('editor')
});

// Now run startCompletion
const handled = startCompletion(view);
console.log("startCompletion returned:", handled);

// Let CodeMirror process the promise internally (autocomplete fetches async, even if synchronous override)
setTimeout(() => {
  const completions = currentCompletions(view.state);
  console.log("Current completions after startCompletion:", completions);
  
  view.dispatch({
    changes: {from: 7, to: 7, insert: "h"},
    selection: {anchor: 8}
  });
  
  setTimeout(() => {
    console.log("Current completions after typing 'h':", currentCompletions(view.state));
    
    // Now test wiki link
    view.dispatch({
      changes: {from: 0, to: 8, insert: "[["},
      selection: {anchor: 2}
    });
    startCompletion(view);
    
    setTimeout(() => {
      console.log("Current completions after [[':", currentCompletions(view.state));
      process.exit(0);
    }, 50);
  }, 50);
}, 50);
