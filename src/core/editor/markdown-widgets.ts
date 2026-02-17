import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import { syntaxTree } from "@codemirror/language";
import { RangeSetBuilder } from "@codemirror/state";

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

function getDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const tree = syntaxTree(view.state);
  const activeLines = getActiveLines(view);

  tree.iterate({
    enter(node) {
      const from = node.from;
      const to = node.to;
      const type = node.name;
      const active = isLineActive(view, from, activeLines);

      // ATX headings
      if (/^ATXHeading[1-6]$/.test(type)) {
        const level = type.replace("ATXHeading", "");
        builder.add(from, to, Decoration.mark({ class: `cm-md-header cm-md-header-${level}` }));

        if (!active) {
          const line = view.state.doc.lineAt(from);
          const hashEnd = line.text.indexOf(" ") + 1;
          if (hashEnd > 0) {
            builder.add(line.from, line.from + hashEnd, Decoration.mark({ class: "cm-md-hide" }));
          }
        }
      }

      // Strong/Bold
      if (type === "StrongEmphasis") {
        builder.add(from, to, Decoration.mark({ class: "cm-md-bold" }));
        if (!active) {
          builder.add(from, from + 2, Decoration.mark({ class: "cm-md-hide" }));
          builder.add(to - 2, to, Decoration.mark({ class: "cm-md-hide" }));
        }
      }

      // Italic/Emphasis
      if (type === "Emphasis") {
        builder.add(from, to, Decoration.mark({ class: "cm-md-italic" }));
        if (!active) {
          builder.add(from, from + 1, Decoration.mark({ class: "cm-md-hide" }));
          builder.add(to - 1, to, Decoration.mark({ class: "cm-md-hide" }));
        }
      }

      // Inline code
      if (type === "InlineCode") {
        builder.add(from, to, Decoration.mark({ class: "cm-md-code" }));
        if (!active) {
          builder.add(from, from + 1, Decoration.mark({ class: "cm-md-hide" }));
          builder.add(to - 1, to, Decoration.mark({ class: "cm-md-hide" }));
        }
      }

      // Code blocks (FencedCode)
      if (type === "FencedCode") {
        builder.add(from, to, Decoration.mark({ class: "cm-md-code-block" }));

        if (!active) {
          // Hide opening fence line (``` or ```language)
          const firstLine = view.state.doc.lineAt(from);
          builder.add(firstLine.from, firstLine.to, Decoration.mark({ class: "cm-md-hide" }));

          // Hide closing fence line
          const lastLine = view.state.doc.lineAt(to);
          if (lastLine.number !== firstLine.number) {
            builder.add(lastLine.from, lastLine.to, Decoration.mark({ class: "cm-md-hide" }));
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
          builder.add(labelStart, labelEnd, Decoration.mark({ class: "cm-md-link" }));
          if (!active) {
            builder.add(from, from + 1, Decoration.mark({ class: "cm-md-hide" }));
            builder.add(labelEnd, to, Decoration.mark({ class: "cm-md-hide" }));
          }
        }
      }

      // Images
      if (type === "Image") {
        const text = view.state.sliceDoc(from, to);
        const altMatch = text.match(/!\[([^\]]*)\]/);
        const urlMatch = text.match(/\]\(([^)]*)\)/);
        if (altMatch && urlMatch) {
          builder.add(to, to, Decoration.widget({
            widget: new ImageWidget(urlMatch[1], altMatch[1]),
            block: true,
          }));
          if (!active) {
            builder.add(from, to, Decoration.mark({ class: "cm-md-hide" }));
          }
        }
      }

      // Strikethrough
      if (type === "Strikethrough") {
        builder.add(from, to, Decoration.mark({ class: "cm-md-strikethrough" }));
        if (!active) {
          builder.add(from, from + 2, Decoration.mark({ class: "cm-md-hide" }));
          builder.add(to - 2, to, Decoration.mark({ class: "cm-md-hide" }));
        }
      }

      // Blockquote
      if (type === "Blockquote") {
        builder.add(from, to, Decoration.mark({ class: "cm-md-blockquote" }));
      }

      // QuoteMark (the > character)
      if (type === "QuoteMark") {
        if (!active) {
          builder.add(from, to, Decoration.mark({ class: "cm-md-hide" }));
        } else {
          builder.add(from, to, Decoration.mark({ class: "cm-md-syntax-dim" }));
        }
      }

      // Horizontal rule — replace with widget
      if (type === "HorizontalRule") {
        if (!active) {
          builder.add(from, to, Decoration.mark({ class: "cm-md-hide" }));
          builder.add(to, to, Decoration.widget({
            widget: new HorizontalRuleWidget(),
            block: true,
          }));
        } else {
          builder.add(from, to, Decoration.mark({ class: "cm-md-syntax-dim" }));
        }
      }

      // List markers
      if (type === "ListMark") {
        builder.add(from, to, Decoration.mark({ class: "cm-md-list-marker" }));
      }

      // Task list
      if (type === "TaskMarker") {
        const text = view.state.sliceDoc(from, to);
        const checked = text.includes("x") || text.includes("X");
        if (!active) {
          builder.add(from, to, Decoration.mark({ class: "cm-md-hide" }));
          builder.add(from, from, Decoration.widget({
            widget: new CheckboxWidget(checked),
          }));
        } else {
          builder.add(from, to, Decoration.mark({
            class: checked ? "cm-md-task-checked" : "cm-md-task-unchecked",
          }));
        }
      }
    },
  });

  return builder.finish();
}

export const markdownWidgets = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = getDecorations(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = getDecorations(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);
