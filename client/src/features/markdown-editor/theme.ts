import { EditorView } from "@codemirror/view";
import { HighlightStyle } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function buildEditorTheme() {
  return EditorView.theme(
    {
      "&": {
        height: "100%",
        fontSize: "16px",
        backgroundColor: cssVar('--bg'),
        color: cssVar('--fg-secondary'),
        outline: "none",
      },
      ".cm-content": {
        fontFamily: "'Geist', system-ui, sans-serif",
        fontSize: "15px",
        lineHeight: "1.7",
        padding: "8px 48px 24px",
        maxWidth: "800px",
        margin: "0 auto",
        caretColor: cssVar('--accent'),
      },
      ".cm-cursor": {
        borderLeftColor: cssVar('--accent'),
        borderLeftWidth: "2px",
      },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
        backgroundColor: `${cssVar('--surface-2')} !important`,
      },
      ".cm-gutters": {
        display: "none",
      },
      ".cm-activeLine": {
        backgroundColor: `${cssVar('--surface-2')}66`,
      },
      ".cm-scroller": {
        overflow: "visible",
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
        color: cssVar('--fg-muted'),
        fontSize: "0.85em",
      },

      // Headings — use accent color like the mock
      ".cm-md-header": {
        fontFamily: "'Instrument Serif', Georgia, serif",
        fontWeight: "400",
        color: cssVar('--accent'),
      },
      ".cm-md-header-1": { fontSize: "2em", lineHeight: "1.3", letterSpacing: "-0.02em" },
      ".cm-md-header-2": { fontSize: "1.5em", lineHeight: "1.3", letterSpacing: "-0.01em" },
      ".cm-md-header-3": { fontSize: "1.2em", lineHeight: "1.3" },
      ".cm-md-header-4": { fontSize: "1.1em", lineHeight: "1.3" },
      ".cm-md-header-5": { fontSize: "1.05em", lineHeight: "1.3" },
      ".cm-md-header-6": { fontSize: "1em", lineHeight: "1.3" },

      // Bold — fg, not accent
      ".cm-md-bold": {
        fontWeight: "600",
        color: cssVar('--fg'),
      },

      // Italic
      ".cm-md-italic": {
        fontStyle: "italic",
        color: cssVar('--fg-secondary'),
      },

      // Inline code — surface-2 background, accent text
      ".cm-md-code": {
        fontFamily: "'Geist Mono', monospace",
        backgroundColor: cssVar('--surface-2'),
        border: `1px solid ${cssVar('--border')}`,
        borderRadius: "4px",
        padding: "1px 5px",
        fontSize: "0.875em",
        color: cssVar('--accent'),
      },

      // Code block — surface background, themed border
      ".cm-md-codeblock-line": {
        backgroundColor: cssVar('--surface'),
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
        color: cssVar('--fg-muted'),
        fontSize: "0.85em",
        fontFamily: "'Geist Mono', monospace",
        userSelect: "none",
        lineHeight: "inherit",
      },
      ".cm-md-codeblock-first": {
        borderRadius: "8px 8px 0 0",
        paddingTop: "12px",
        borderTop: `1px solid ${cssVar('--border')}`,
        borderLeft: `1px solid ${cssVar('--border')}`,
        borderRight: `1px solid ${cssVar('--border')}`,
        counterReset: "codeblock-line",
        counterIncrement: "codeblock-line",
      },
      ".cm-md-codeblock-last": {
        borderRadius: "0 0 8px 8px",
        paddingBottom: "12px",
        borderBottom: `1px solid ${cssVar('--border')}`,
        borderLeft: `1px solid ${cssVar('--border')}`,
        borderRight: `1px solid ${cssVar('--border')}`,
      },
      ".cm-md-codeblock-first.cm-md-codeblock-last": {
        borderRadius: "8px",
        border: `1px solid ${cssVar('--border')}`,
      },
      ".cm-md-codeblock-fence": {
        backgroundColor: cssVar('--surface'),
        paddingLeft: "16px",
        borderLeft: `1px solid ${cssVar('--border')}`,
        borderRight: `1px solid ${cssVar('--border')}`,
      },
      ".cm-md-codeblock-fence::before": {
        content: "none",
      },
      ".cm-md-codeblock-content": {
        fontFamily: "'Geist Mono', monospace",
        fontSize: "0.875em",
        color: cssVar('--fg-secondary'),
      },
      ".cm-md-codeblock-lang": {
        position: "absolute",
        right: "12px",
        top: "8px",
        fontSize: "0.75em",
        fontFamily: "'Geist Mono', monospace",
        color: cssVar('--fg-muted'),
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        userSelect: "none",
        pointerEvents: "none",
      },

      // Links — accent color
      ".cm-md-link": {
        color: cssVar('--accent'),
        textDecoration: "none",
        borderBottom: `1px solid ${cssVar('--accent-dim')}`,
        cursor: "pointer",
      },

      // Wiki links — fg-secondary with dashed underline
      ".cm-md-wikilink": {
        color: cssVar('--fg-secondary'),
        textDecoration: "none",
        borderBottom: `1px dashed ${cssVar('--border')}`,
        textUnderlineOffset: "2px",
        cursor: "pointer",
      },

      // Strikethrough
      ".cm-md-strikethrough": {
        textDecoration: "line-through",
        color: cssVar('--fg-muted'),
      },

      // Blockquote — accent left border
      ".cm-md-blockquote": {
        borderLeft: `2px solid ${cssVar('--accent')}`,
        paddingLeft: "16px",
        color: cssVar('--fg-muted'),
        fontStyle: "italic",
      },

      // Horizontal rule widget
      ".cm-md-hr-widget": {
        border: "none",
        borderTop: `1px solid ${cssVar('--border')}`,
        margin: "12px 0",
      },

      // List markers
      ".cm-md-list-marker": {
        color: cssVar('--fg-muted'),
      },

      // Checkbox widgets
      ".cm-md-checkbox": {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "16px",
        height: "16px",
        border: `2px solid ${cssVar('--border')}`,
        borderRadius: "3px",
        marginRight: "4px",
        verticalAlign: "middle",
        fontSize: "11px",
        lineHeight: "1",
        color: "transparent",
      },
      ".cm-md-checkbox-checked": {
        backgroundColor: cssVar('--accent'),
        borderColor: cssVar('--accent'),
        color: cssVar('--bg'),
      },

      // Task markers
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

      // Table wrapper
      ".cm-md-table-wrapper": {
        margin: "8px 0",
        overflowX: "auto",
        borderRadius: "8px",
        border: `1px solid ${cssVar('--border')}`,
      },

      // Table element
      ".cm-md-table": {
        borderCollapse: "collapse",
        width: "100%",
        fontSize: "0.9em",
      },

      // Header cells
      ".cm-md-table th": {
        backgroundColor: cssVar('--surface'),
        color: cssVar('--fg'),
        fontWeight: "600",
        padding: "8px 16px",
        textAlign: "left",
        borderBottom: `2px solid ${cssVar('--border')}`,
        borderRight: `1px solid ${cssVar('--border')}`,
        whiteSpace: "nowrap",
      },
      ".cm-md-table th:last-child": {
        borderRight: "none",
      },

      // Data cells
      ".cm-md-table td": {
        padding: "7px 16px",
        color: cssVar('--fg-secondary'),
        borderBottom: `1px solid ${cssVar('--border')}`,
        borderRight: `1px solid ${cssVar('--border')}`,
      },
      ".cm-md-table td:last-child": {
        borderRight: "none",
      },
      ".cm-md-table tr:last-child td": {
        borderBottom: "none",
      },
      ".cm-md-table tbody tr:hover td": {
        backgroundColor: `${cssVar('--surface-2')}66`,
      },

      // Raw table lines (when cursor is inside table)
      ".cm-md-table-raw-line": {
        fontFamily: "'Geist Mono', monospace",
        fontSize: "0.875em",
        color: cssVar('--fg-muted'),
      },
    },
    { dark: true }
  );
}

// Backward compat: static theme used by setup.ts
export const obsidianTheme = buildEditorTheme();

// Catppuccin Mocha syntax highlighting for code blocks
export const codeHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: "#cba6f7" },
  { tag: t.controlKeyword, color: "#cba6f7" },
  { tag: t.operatorKeyword, color: "#cba6f7" },
  { tag: t.definitionKeyword, color: "#cba6f7" },
  { tag: t.moduleKeyword, color: "#cba6f7" },
  { tag: t.function(t.variableName), color: "#89b4fa" },
  { tag: t.function(t.definition(t.variableName)), color: "#89b4fa" },
  { tag: t.variableName, color: "#cdd6f4" },
  { tag: t.definition(t.variableName), color: "#cdd6f4" },
  { tag: t.propertyName, color: "#89dceb" },
  { tag: t.definition(t.propertyName), color: "#89dceb" },
  { tag: t.string, color: "#a6e3a1" },
  { tag: t.special(t.string), color: "#a6e3a1" },
  { tag: t.number, color: "#fab387" },
  { tag: t.integer, color: "#fab387" },
  { tag: t.float, color: "#fab387" },
  { tag: t.bool, color: "#fab387" },
  { tag: t.null, color: "#fab387" },
  { tag: t.comment, color: "#6c7086", fontStyle: "italic" },
  { tag: t.lineComment, color: "#6c7086", fontStyle: "italic" },
  { tag: t.blockComment, color: "#6c7086", fontStyle: "italic" },
  { tag: t.typeName, color: "#f9e2af" },
  { tag: t.className, color: "#f9e2af" },
  { tag: t.namespace, color: "#f9e2af" },
  { tag: t.operator, color: "#89dceb" },
  { tag: t.punctuation, color: "#9399b2" },
  { tag: t.bracket, color: "#9399b2" },
  { tag: t.separator, color: "#9399b2" },
  { tag: t.regexp, color: "#f38ba8" },
  { tag: t.tagName, color: "#f38ba8" },
  { tag: t.attributeName, color: "#f9e2af" },
  { tag: t.attributeValue, color: "#a6e3a1" },
  { tag: t.meta, color: "#f5c2e7" },
  { tag: t.annotation, color: "#f5c2e7" },
  { tag: t.escape, color: "#f5c2e7" },
  { tag: t.self, color: "#f38ba8" },
  { tag: t.atom, color: "#fab387" },
]);
