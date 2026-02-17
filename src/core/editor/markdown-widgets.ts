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

class CodeBlockLangWidget extends WidgetType {
  constructor(private lang: string) {
    super();
  }
  toDOM() {
    const span = document.createElement("span");
    span.className = "cm-md-codeblock-lang";
    span.textContent = this.lang;
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
    if (from >= to) return;
    decorations.push(Decoration.mark({ class: cls }).range(from, to));
  };

  const line = (pos: number, cls: string) => {
    decorations.push(Decoration.line({ class: cls }).range(pos));
  };

  const widget = (pos: number, w: WidgetType, block = false) => {
    decorations.push(Decoration.widget({ widget: w, block }).range(pos));
  };

  // Wiki links [[note name]] — regex-based since the markdown parser doesn't know them
  const wikiLinkRe = /\[\[([^\]]+)\]\]/g;
  const doc = view.state.doc;
  for (let i = 1; i <= doc.lines; i++) {
    const lineObj = doc.line(i);
    const lineActive = activeLines.has(i);
    let match: RegExpExecArray | null;
    wikiLinkRe.lastIndex = 0;
    while ((match = wikiLinkRe.exec(lineObj.text)) !== null) {
      const start = lineObj.from + match.index;
      const end = start + match[0].length;
      const nameStart = start + 2;
      const nameEnd = end - 2;

      mark(nameStart, nameEnd, "cm-md-wikilink");
      if (!lineActive) {
        mark(start, nameStart, "cm-md-hide");    // [[
        mark(nameEnd, end, "cm-md-hide");         // ]]
      } else {
        mark(start, nameStart, "cm-md-syntax-dim");
        mark(nameEnd, end, "cm-md-syntax-dim");
      }
    }
  }

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
          const nodeLine = view.state.doc.lineAt(from);
          const hashEnd = nodeLine.text.indexOf(" ") + 1;
          if (hashEnd > 0) {
            mark(nodeLine.from, nodeLine.from + hashEnd, "cm-md-hide");
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

      // Code blocks (FencedCode) — line decorations for block styling
      if (type === "FencedCode") {
        const doc = view.state.doc;
        const firstLine = doc.lineAt(from);
        const lastLine = doc.lineAt(to);

        // Extract language from opening fence
        const fenceText = firstLine.text.trim();
        const langMatch = fenceText.match(/^`{3,}(\w+)/);
        const lang = langMatch ? langMatch[1] : "";

        // Content lines (between fences)
        const contentStartLine = firstLine.number + 1;
        const contentEndLine = lastLine.number - 1;

        const isSingleFenceLine = firstLine.number === lastLine.number;

        if (!active) {
          // Hide fence lines
          mark(firstLine.from, firstLine.to, "cm-md-hide");
          if (!isSingleFenceLine) {
            mark(lastLine.from, lastLine.to, "cm-md-hide");
          }
        }

        // Apply line decorations for content lines
        if (contentStartLine <= contentEndLine) {
          for (let i = contentStartLine; i <= contentEndLine; i++) {
            const lineObj = doc.line(i);
            let cls = "cm-md-codeblock-line";
            if (i === contentStartLine) cls += " cm-md-codeblock-first";
            if (i === contentEndLine) cls += " cm-md-codeblock-last";

            // Apply mark for monospace font on content
            mark(lineObj.from, lineObj.to, "cm-md-codeblock-content");
            line(lineObj.from, cls);
          }

          // Add language label widget on the first content line
          if (lang && !active) {
            const firstContentLine = doc.line(contentStartLine);
            widget(firstContentLine.from, new CodeBlockLangWidget(lang));
          }
        }

        // If cursor is active, also style the fence lines
        if (active) {
          line(firstLine.from, "cm-md-codeblock-line cm-md-codeblock-fence");
          if (!isSingleFenceLine) {
            line(lastLine.from, "cm-md-codeblock-line cm-md-codeblock-fence");
          }
          mark(firstLine.from, firstLine.to, "cm-md-codeblock-content");
          if (!isSingleFenceLine) {
            mark(lastLine.from, lastLine.to, "cm-md-codeblock-content");
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

const setDecorations = StateEffect.define<DecorationSet>();

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

const decorationUpdater = EditorView.updateListener.of((update) => {
  if (update.docChanged || update.viewportChanged || update.selectionSet) {
    const decos = buildDecorations(update.view);
    update.view.dispatch({ effects: setDecorations.of(decos) });
  }
});

// Click handler for wiki links and external links
const linkClickHandler = EditorView.domEventHandlers({
  click(event: MouseEvent, view: EditorView) {
    const target = event.target as HTMLElement;

    // External links: click on the label text opens the URL in a new tab
    if (target.classList.contains("cm-md-link")) {
      const pos = view.posAtDOM(target);
      const tree = syntaxTree(view.state);
      let linkNode = tree.resolveInner(pos, 1);
      // Walk up to find the Link node
      while (linkNode && linkNode.name !== "Link") {
        if (!linkNode.parent) break;
        linkNode = linkNode.parent;
      }
      if (linkNode?.name === "Link") {
        const text = view.state.sliceDoc(linkNode.from, linkNode.to);
        const urlMatch = text.match(/\]\(([^)]*)\)/);
        if (urlMatch?.[1]) {
          window.open(urlMatch[1], "_blank", "noopener,noreferrer");
          return true;
        }
      }
      return false;
    }

    // Wiki links
    if (target.classList.contains("cm-md-wikilink")) {
      const pos = view.posAtDOM(target);
      const lineObj = view.state.doc.lineAt(pos);
      const wikiLinkRe = /\[\[([^\]]+)\]\]/g;
      let match: RegExpExecArray | null;
      while ((match = wikiLinkRe.exec(lineObj.text)) !== null) {
        const nameStart = lineObj.from + match.index + 2;
        const nameEnd = nameStart + match[1].length;
        if (pos >= nameStart && pos <= nameEnd) {
          import("@core/store").then(({ store }) => {
            const resolved = store.resolveWikiLink(match![1]);
            if (resolved) {
              store.openFile(resolved);
            }
          });
          return true;
        }
      }
      return false;
    }

    return false;
  },
});

export const markdownWidgets: Extension = [decorationField, decorationUpdater, linkClickHandler];
