import { EditorView } from "@codemirror/view";
import { keymap, type KeyBinding } from "@codemirror/view";
import type { Extension } from "@codemirror/state";

function wrapSelection(view: EditorView, before: string, after: string): boolean {
  const { from, to } = view.state.selection.main;
  const selected = view.state.sliceDoc(from, to);

  // If already wrapped, unwrap
  const beforeLen = before.length;
  const afterLen = after.length;
  if (
    from >= beforeLen &&
    view.state.sliceDoc(from - beforeLen, from) === before &&
    view.state.sliceDoc(to, to + afterLen) === after
  ) {
    view.dispatch({
      changes: [
        { from: from - beforeLen, to: from, insert: "" },
        { from: to, to: to + afterLen, insert: "" },
      ],
      selection: { anchor: from - beforeLen, head: to - beforeLen },
    });
    return true;
  }

  // Wrap
  view.dispatch({
    changes: [
      { from, insert: before },
      { from: to, insert: after },
    ],
    selection: { anchor: from + beforeLen, head: to + beforeLen },
  });
  return true;
}

function insertPrefix(view: EditorView, prefix: string): boolean {
  const { from } = view.state.selection.main;
  const line = view.state.doc.lineAt(from);

  // If already prefixed, remove
  if (line.text.startsWith(prefix)) {
    view.dispatch({
      changes: { from: line.from, to: line.from + prefix.length, insert: "" },
    });
    return true;
  }

  view.dispatch({
    changes: { from: line.from, insert: prefix },
  });
  return true;
}

const markdownKeybindings: KeyBinding[] = [
  {
    key: "Mod-b",
    run: (view) => wrapSelection(view, "**", "**"),
  },
  {
    key: "Mod-i",
    run: (view) => wrapSelection(view, "*", "*"),
  },
  {
    key: "Mod-k",
    run: (view) => {
      const { from, to } = view.state.selection.main;
      const selected = view.state.sliceDoc(from, to);
      const insert = `[${selected}](url)`;
      view.dispatch({
        changes: { from, to, insert },
        // Place cursor on "url"
        selection: { anchor: from + selected.length + 3, head: from + selected.length + 6 },
      });
      return true;
    },
  },
  {
    key: "Mod-Shift-k",
    run: (view) => wrapSelection(view, "`", "`"),
  },
  {
    key: "Mod-Shift-x",
    run: (view) => wrapSelection(view, "~~", "~~"),
  },
  {
    key: "Mod-Shift-7",
    run: (view) => insertPrefix(view, "1. "),
  },
  {
    key: "Mod-Shift-8",
    run: (view) => insertPrefix(view, "- "),
  },
  {
    key: "Mod-Shift-9",
    run: (view) => insertPrefix(view, "> "),
  },
];

export const markdownKeymap: Extension = keymap.of(markdownKeybindings);
