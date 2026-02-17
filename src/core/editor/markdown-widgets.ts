import {
  Decoration,
  DecorationSet,
  EditorView,
  WidgetType,
} from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { Range, StateField, StateEffect, Extension } from "@codemirror/state";

class ImageWidget extends WidgetType {
  constructor(private url: string, private alt: string) {
    super();
  }
  toDOM() {
    const img = document.createElement("img");
    img.src = this.url;
    img.alt = this.alt;
    img.className = "cm-md-image-widget";
    return img;
  }
}

class HorizontalRuleWidget extends WidgetType {
  toDOM() {
    const hr = document.createElement("hr");
    hr.className = "cm-md-hr-widget";
    return hr;
  }
}

class CheckboxWidget extends WidgetType {
  constructor(private checked: boolean) {
    super();
  }
  toDOM() {
    const span = document.createElement("span");
    span.className = this.checked
      ? "cm-md-checkbox cm-md-checkbox-checked"
      : "cm-md-checkbox";
    span.textContent = this.checked ? "✓" : "";
    return span;
  }
}

function getActiveLines(view: EditorView): Set<number> {
  const lines = new Set<number>();
  for (const range of view.state.selection.ranges) {
    const startLine = view.state.doc.lineAt(range.from).number;
    const endLine = view.state.doc.lineAt(range.to).number;
    for (let i = startLine; i <= endLine; i++) {
      lines.add(i);
    }
  }
  return lines;
}

function isLineActive(view: EditorView, pos: number, activeLines: Set<number>): boolean {
  return activeLines.has(view.state.doc.lineAt(pos).number);
}

function buildDecorations(view: EditorView): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const tree = syntaxTree(view.state);
  const activeLines = getActiveLines(view);

  const mark = (from: number, to: number, cls: string) => {
    decorations.push(Decoration.mark({ class: cls }).range(from, to));
  };

  const widget = (pos: number, w: WidgetType, block = false) => {
    decorations.push(Decoration.widget({ widget: w, block }).range(pos));
  };

  tree.iterate({
    enter(node) {
      const from = node.from;
      const to = node.to;
      const type = node.name;
      const active = isLineActive(view, from, activeLines);

      // ATX headings
      if (/^ATXHeading[1-6]$/.test(type)) {
        const level = type.replace("ATXHeading", "");
        mark(from, to, `cm-md-header cm-md-header-${level}`);
        if (!active) {
          const line = view.state.doc.lineAt(from);
          const hashEnd = line.text.indexOf(" ") + 1;
          if (hashEnd > 0) {
            mark(line.from, line.from + hashEnd, "cm-md-hide");
          }
        }
      }

      // Strong/Bold
      if (type === "StrongEmphasis") {
        mark(from, to, "cm-md-bold");
        if (!active) {
          mark(from, from + 2, "cm-md-hide");
          mark(to - 2, to, "cm-md-hide");
        }
      }

      // Italic/Emphasis
      if (type === "Emphasis") {
        mark(from, to, "cm-md-italic");
        if (!active) {
          mark(from, from + 1, "cm-md-hide");
          mark(to - 1, to, "cm-md-hide");
        }
      }

      // Inline code
      if (type === "InlineCode") {
        mark(from, to, "cm-md-code");
        if (!active) {
          mark(from, from + 1, "cm-md-hide");
          mark(to - 1, to, "cm-md-hide");
        }
      }

      // Code blocks (FencedCode)
      if (type === "FencedCode") {
        mark(from, to, "cm-md-code-block");
        if (!active) {
          const firstLine = view.state.doc.lineAt(from);
          mark(firstLine.from, firstLine.to, "cm-md-hide");
          const lastLine = view.state.doc.lineAt(to);
          if (lastLine.number !== firstLine.number) {
            mark(lastLine.from, lastLine.to, "cm-md-hide");
          }
        }
      }

      // Links
      if (type === "Link") {
        const text = view.state.sliceDoc(from, to);
        const labelMatch = text.match(/^\[([^\]]*)\]/);
        const urlMatch = text.match(/\]\(([^)]*)\)/);
        if (labelMatch && urlMatch) {
          const labelStart = from + 1;
          const labelEnd = from + 1 + labelMatch[1].length;
          mark(labelStart, labelEnd, "cm-md-link");
          if (!active) {
            mark(from, from + 1, "cm-md-hide");
            mark(labelEnd, to, "cm-md-hide");
          }
        }
      }

      // Images
      if (type === "Image") {
        const text = view.state.sliceDoc(from, to);
        const altMatch = text.match(/!\[([^\]]*)\]/);
        const urlMatch = text.match(/\]\(([^)]*)\)/);
        if (altMatch && urlMatch) {
          widget(to, new ImageWidget(urlMatch[1], altMatch[1]), true);
          if (!active) {
            mark(from, to, "cm-md-hide");
          }
        }
      }

      // Strikethrough
      if (type === "Strikethrough") {
        mark(from, to, "cm-md-strikethrough");
        if (!active) {
          mark(from, from + 2, "cm-md-hide");
          mark(to - 2, to, "cm-md-hide");
        }
      }

      // Blockquote
      if (type === "Blockquote") {
        mark(from, to, "cm-md-blockquote");
      }

      // QuoteMark (the > character)
      if (type === "QuoteMark") {
        mark(from, to, active ? "cm-md-syntax-dim" : "cm-md-hide");
      }

      // Horizontal rule
      if (type === "HorizontalRule") {
        if (!active) {
          mark(from, to, "cm-md-hide");
          widget(to, new HorizontalRuleWidget(), true);
        } else {
          mark(from, to, "cm-md-syntax-dim");
        }
      }

      // List markers
      if (type === "ListMark") {
        mark(from, to, "cm-md-list-marker");
      }

      // Task list
      if (type === "TaskMarker") {
        const text = view.state.sliceDoc(from, to);
        const checked = text.includes("x") || text.includes("X");
        if (!active) {
          mark(from, to, "cm-md-hide");
          widget(from, new CheckboxWidget(checked));
        } else {
          mark(from, to, checked ? "cm-md-task-checked" : "cm-md-task-unchecked");
        }
      }
    },
  });

  return Decoration.set(decorations, true);
}

// StateEffect to push new decorations into the StateField
const setDecorations = StateEffect.define<DecorationSet>();

// StateField holds the decorations and provides them (supports block widgets)
const decorationField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setDecorations)) {
        return effect.value;
      }
    }
    return value;
  },
  provide: (field) => EditorView.decorations.from(field),
});

// Listener that recomputes decorations and pushes them via effect.
// updateListener runs after the update cycle, so dispatching is safe.
// The dispatched effect only changes the StateField (no doc/selection change),
// so the listener won't re-trigger in a loop.
const decorationUpdater = EditorView.updateListener.of((update) => {
  if (update.docChanged || update.viewportChanged || update.selectionSet) {
    const decos = buildDecorations(update.view);
    update.view.dispatch({ effects: setDecorations.of(decos) });
  }
});

export const markdownWidgets: Extension = [decorationField, decorationUpdater];
