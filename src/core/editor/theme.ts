import { EditorView } from "@codemirror/view";

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

    // Code blocks
    ".cm-md-code-block": {
      fontFamily: "'JetBrains Mono', monospace",
      backgroundColor: "#313244",
      borderRadius: "6px",
      padding: "2px 8px",
      fontSize: "0.9em",
      color: "#cdd6f4",
    },

    // Links
    ".cm-md-link": {
      color: "#89b4fa",
      textDecoration: "underline",
      cursor: "pointer",
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
