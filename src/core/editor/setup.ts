import { EditorState } from "@codemirror/state";
import { EditorView, keymap, drawSelection, highlightActiveLine } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { obsidianTheme } from "./theme";
import { markdownWidgets } from "./markdown-widgets";

export interface EditorInstance {
  view: EditorView;
  setContent(content: string): void;
  getContent(): string;
  destroy(): void;
}

export function createEditor(
  parent: HTMLElement,
  onChange: (content: string) => void
): EditorInstance {
  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      onChange(update.state.doc.toString());
    }
  });

  const state = EditorState.create({
    doc: "",
    extensions: [
      history(),
      drawSelection(),
      highlightActiveLine(),
      closeBrackets(),
      markdown({ base: markdownLanguage }),
      keymap.of([...defaultKeymap, ...historyKeymap, ...closeBracketsKeymap]),
      obsidianTheme,
      markdownWidgets,
      updateListener,
      EditorView.lineWrapping,
    ],
  });

  const view = new EditorView({ state, parent });

  return {
    view,
    setContent(content: string) {
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: content,
        },
      });
    },
    getContent() {
      return view.state.doc.toString();
    },
    destroy() {
      view.destroy();
    },
  };
}
