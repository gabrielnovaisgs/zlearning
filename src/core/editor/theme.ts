import { EditorView } from "@codemirror/view";
import { HighlightStyle } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

export const obsidianTheme = EditorView.theme(
  {
    "&": {
      height: "100%",
      fontSize: "16px",
      backgroundColor: "#1e1e2e",
      color: "#cdd6f4",
    },
    ".cm-content": {
      fontFamily: "'Inter', system-ui, sans-serif",
      padding: "24px 48px",
      maxWidth: "800px",
      margin: "0 auto",
      caretColor: "#cba6f7",
    },
    ".cm-cursor": {
      borderLeftColor: "#cba6f7",
      borderLeftWidth: "2px",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor: "#45475a !important",
    },
    ".cm-gutters": {
      display: "none",
    },
    ".cm-activeLine": {
      backgroundColor: "rgba(69, 71, 90, 0.3)",
    },
    ".cm-scroller": {
      overflow: "auto",
    },

    // Hidden syntax markers (invisible when cursor not on line)
    ".cm-md-hide": {
      fontSize: "0",
      display: "inline",
      width: "0",
      overflow: "hidden",
      color: "transparent",
    },

    // Dimmed syntax (visible but muted, when cursor IS on line)
    ".cm-md-syntax-dim": {
      color: "#585b70",
      fontSize: "0.85em",
    },

    // Headings
    ".cm-md-header": {
      fontWeight: "700",
      color: "#cba6f7",
    },
    ".cm-md-header-1": { fontSize: "2em", lineHeight: "1.4" },
    ".cm-md-header-2": { fontSize: "1.6em", lineHeight: "1.4" },
    ".cm-md-header-3": { fontSize: "1.3em", lineHeight: "1.3" },
    ".cm-md-header-4": { fontSize: "1.1em", lineHeight: "1.3" },
    ".cm-md-header-5": { fontSize: "1.05em", lineHeight: "1.3" },
    ".cm-md-header-6": { fontSize: "1em", lineHeight: "1.3" },

    // Bold
    ".cm-md-bold": {
      fontWeight: "700",
      color: "#f38ba8",
    },

    // Italic
    ".cm-md-italic": {
      fontStyle: "italic",
      color: "#a6e3a1",
    },

    // Inline code
    ".cm-md-code": {
      fontFamily: "'JetBrains Mono', monospace",
      backgroundColor: "#313244",
      borderRadius: "3px",
      padding: "1px 4px",
      fontSize: "0.9em",
      color: "#fab387",
    },

    // Code block — line decorations for block appearance
    ".cm-md-codeblock-line": {
      backgroundColor: "#181825",
      paddingLeft: "52px",
      position: "relative",
      counterIncrement: "codeblock-line",
    },
    ".cm-md-codeblock-line::before": {
      content: "counter(codeblock-line)",
      position: "absolute",
      left: "0",
      width: "40px",
      textAlign: "right",
      paddingRight: "12px",
      color: "#585b70",
      fontSize: "0.85em",
      fontFamily: "'JetBrains Mono', monospace",
      userSelect: "none",
      lineHeight: "inherit",
    },
    ".cm-md-codeblock-first": {
      borderRadius: "8px 8px 0 0",
      paddingTop: "12px",
      counterReset: "codeblock-line",
      counterIncrement: "codeblock-line",
    },
    ".cm-md-codeblock-last": {
      borderRadius: "0 0 8px 8px",
      paddingBottom: "12px",
    },
    // When there's only one content line (first + last)
    ".cm-md-codeblock-first.cm-md-codeblock-last": {
      borderRadius: "8px",
    },
    ".cm-md-codeblock-fence": {
      backgroundColor: "#181825",
      paddingLeft: "16px",
    },
    ".cm-md-codeblock-fence::before": {
      content: "none",
    },
    ".cm-md-codeblock-content": {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: "0.9em",
      color: "#cdd6f4",
    },
    // Language label
    ".cm-md-codeblock-lang": {
      position: "absolute",
      right: "12px",
      top: "8px",
      fontSize: "0.75em",
      fontFamily: "'JetBrains Mono', monospace",
      color: "#585b70",
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      userSelect: "none",
      pointerEvents: "none",
    },

    // Links
    ".cm-md-link": {
      color: "#89b4fa",
      textDecoration: "underline",
      cursor: "pointer",
    },

    // Wiki links
    ".cm-md-wikilink": {
      color: "#cba6f7",
      textDecoration: "underline",
      textDecorationColor: "rgba(203, 166, 247, 0.4)",
      textUnderlineOffset: "2px",
      cursor: "pointer",
      "&:hover": {
        textDecorationColor: "#cba6f7",
      },
    },

    // Strikethrough
    ".cm-md-strikethrough": {
      textDecoration: "line-through",
      color: "#6c7086",
    },

    // Blockquote
    ".cm-md-blockquote": {
      borderLeft: "3px solid #585b70",
      paddingLeft: "12px",
      color: "#a6adc8",
      fontStyle: "italic",
    },

    // Horizontal rule widget
    ".cm-md-hr-widget": {
      border: "none",
      borderTop: "1px solid #585b70",
      margin: "12px 0",
    },

    // List markers
    ".cm-md-list-marker": {
      color: "#89b4fa",
      fontWeight: "700",
    },

    // Checkbox widgets
    ".cm-md-checkbox": {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: "16px",
      height: "16px",
      border: "2px solid #585b70",
      borderRadius: "3px",
      marginRight: "4px",
      verticalAlign: "middle",
      fontSize: "11px",
      lineHeight: "1",
      color: "transparent",
    },
    ".cm-md-checkbox-checked": {
      backgroundColor: "#a6e3a1",
      borderColor: "#a6e3a1",
      color: "#1e1e2e",
    },

    // Task markers (when cursor is on line, showing raw syntax)
    ".cm-md-task-checked": {
      color: "#a6e3a1",
    },
    ".cm-md-task-unchecked": {
      color: "#585b70",
    },

    // Images
    ".cm-md-image-widget": {
      maxWidth: "100%",
      borderRadius: "8px",
      margin: "8px 0",
    },
  },
  { dark: true }
);

// Catppuccin Mocha syntax highlighting for code blocks
export const codeHighlightStyle = HighlightStyle.define([
  // Keywords: if, else, return, function, const, let, var, class, etc.
  { tag: t.keyword, color: "#cba6f7" },
  { tag: t.controlKeyword, color: "#cba6f7" },
  { tag: t.operatorKeyword, color: "#cba6f7" },
  { tag: t.definitionKeyword, color: "#cba6f7" },
  { tag: t.moduleKeyword, color: "#cba6f7" },

  // Functions
  { tag: t.function(t.variableName), color: "#89b4fa" },
  { tag: t.function(t.definition(t.variableName)), color: "#89b4fa" },

  // Variables and properties
  { tag: t.variableName, color: "#cdd6f4" },
  { tag: t.definition(t.variableName), color: "#cdd6f4" },
  { tag: t.propertyName, color: "#89dceb" },
  { tag: t.definition(t.propertyName), color: "#89dceb" },

  // Strings
  { tag: t.string, color: "#a6e3a1" },
  { tag: t.special(t.string), color: "#a6e3a1" },

  // Numbers
  { tag: t.number, color: "#fab387" },
  { tag: t.integer, color: "#fab387" },
  { tag: t.float, color: "#fab387" },

  // Boolean, null
  { tag: t.bool, color: "#fab387" },
  { tag: t.null, color: "#fab387" },

  // Comments
  { tag: t.comment, color: "#6c7086", fontStyle: "italic" },
  { tag: t.lineComment, color: "#6c7086", fontStyle: "italic" },
  { tag: t.blockComment, color: "#6c7086", fontStyle: "italic" },

  // Types and classes
  { tag: t.typeName, color: "#f9e2af" },
  { tag: t.className, color: "#f9e2af" },
  { tag: t.namespace, color: "#f9e2af" },

  // Operators and punctuation
  { tag: t.operator, color: "#89dceb" },
  { tag: t.punctuation, color: "#9399b2" },
  { tag: t.bracket, color: "#9399b2" },
  { tag: t.separator, color: "#9399b2" },

  // Regex
  { tag: t.regexp, color: "#f38ba8" },

  // Tags (HTML/JSX)
  { tag: t.tagName, color: "#f38ba8" },
  { tag: t.attributeName, color: "#f9e2af" },
  { tag: t.attributeValue, color: "#a6e3a1" },

  // Meta, annotations, decorators
  { tag: t.meta, color: "#f5c2e7" },
  { tag: t.annotation, color: "#f5c2e7" },

  // Escape sequences
  { tag: t.escape, color: "#f5c2e7" },

  // Self/this
  { tag: t.self, color: "#f38ba8" },

  // Atoms
  { tag: t.atom, color: "#fab387" },
]);
