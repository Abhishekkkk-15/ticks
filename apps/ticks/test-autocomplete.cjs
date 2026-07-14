const { EditorState } = require('@codemirror/state');
const { markdownLanguage } = require('@codemirror/lang-markdown');
const { CompletionContext } = require('@codemirror/autocomplete');

const source = (context) => {
  const wikiWord = context.matchBefore(/\[\[[^\]]*$/);
  if (wikiWord) {
    return { from: wikiWord.from, options: [{ label: 'Wiki Test' }] };
  }
  const slashWord = context.matchBefore(/\/\w*$/);
  if (slashWord) {
    return { from: slashWord.from, options: [{ label: 'Slash Test' }] };
  }
  return null;
};

const state = EditorState.create({
  doc: "Hello /",
  selection: { anchor: 7 },
  extensions: [
    markdownLanguage.data.of({ autocomplete: source })
  ]
});

const context = new CompletionContext(state, 7, true);
const result = source(context);

console.log("Result for 'Hello /':", result);

const state2 = EditorState.create({
  doc: "Hello [[",
  selection: { anchor: 8 },
  extensions: [
    markdownLanguage.data.of({ autocomplete: source })
  ]
});

const context2 = new CompletionContext(state2, 8, true);
const result2 = source(context2);

console.log("Result for 'Hello [[':", result2);
