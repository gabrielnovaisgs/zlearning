# Markdown Preview Mode — Design Spec

**Date:** 2026-03-24
**Branch:** feat/markdown-preview-mode (a criar)
**Status:** Approved

---

## Overview

Add a "Leitura" (reading) view mode to the markdown editor, toggled by a segmented control in the editor header. In reading mode, the markdown is rendered as interactive HTML using `react-markdown`. Checkboxes are clickable and save back to the `.md` file. Wiki links navigate between notes (Ctrl+click opens a new pane).

---

## 1. Component Architecture

### New files

```
client/src/features/markdown-editor/
  ViewToggle.tsx          — segmented control "Editar / Leitura"
  MarkdownPreview.tsx     — react-markdown renderer with custom components
  remark-wiki-link.ts     — remark plugin to parse [[wiki links]]
```

### Modified files

```
  MarkdownEditor.tsx      — adds viewMode state, ViewToggle, conditional rendering
  theme.ts                — adds .md-preview prose styles
```

### Layout

```
┌─────────────────────────────────────────────────────┐
│ [sticky bar]                    ViewToggle (top-right)│
├─────────────────────────────────────────────────────┤
│ ↕ scroll                                            │
│   EditableTitle                                     │
│   CodeMirror div  ←(display:none)→  MarkdownPreview │
└─────────────────────────────────────────────────────┘
```

### State

`viewMode: 'edit' | 'read'` lives as local `useState` in `MarkdownEditor` — it is pure UI state, no store needed.

The CodeMirror editor is **never destroyed** when switching modes. It is hidden via `display: none` / `visibility: hidden` to preserve undo history and cursor position.

---

## 2. ViewToggle Component

Segmented control with two buttons using `lucide-react` icons:

- **Editar** — `<Pencil size={13} />` — active when `viewMode === 'edit'`
- **Leitura** — `<Eye size={13} />` — active when `viewMode === 'read'`

Active button: `background: --surface`, `color: --accent`.
Inactive button: `color: --fg-muted`.
Container: `background: --surface-2`, `border: --border`, `border-radius: 6px`.

The toggle bar is rendered outside the scroll container (sticky), aligned to the right within the same `max-width: 800px` column as the editor content.

---

## 3. MarkdownPreview Component

```tsx
interface Props {
  content: string;
  filePath: string;
  onCheckboxToggle: (index: number, checked: boolean) => void;
}
```

Uses `react-markdown` with:
- `remarkPlugins={[remarkGfm, remarkWikiLink]}`
- Custom `components` for: `input`, `a`, `wikiLink`

Wrapped in `<div className="md-preview">` — same max-width and padding as CodeMirror content area (`max-width: 800px; margin: 0 auto; padding: 8px 48px 24px`).

### Custom component: checkbox (`input`)

Replaces `<input type="checkbox">` with a Lucide icon pair:
- Unchecked: `<Square size={15} />` — `color: --border`
- Checked: `<SquareCheck size={15} />` — `color: --accent`

Index tracked via `useRef` counter (`checkboxIndexRef`) that resets on each render and increments per checkbox. On click, calls `onCheckboxToggle(idx, !checked)`.

### Custom component: links (`a`)

Three cases resolved in order:

1. **`pdf-highlight://uuid`** — calls `pdfStore.setTarget(id)` via dynamic import
2. **`[[wiki link]]`** rendered by `wikiLink` node (see remark plugin) — `onClick` navigates via `openFileInPane`; `Ctrl/Cmd+click` passes a new pane ID via `splitPane` first
3. **External links** — `window.open(url, '_blank', 'noopener,noreferrer')`

---

## 4. Checkbox Save Mechanism

`handleCheckboxToggle(index: number, checked: boolean)` in `MarkdownEditor`:

```
1. Split content by '\n'
2. Walk lines, count task items matching /^(\s*[-*+]\s+)\[[ x]\]/i
3. On the Nth match, replace [ ] / [x] with the new state
4. Join lines and call fs.writeFile(filePath, newContent)
```

Save is **immediate** (no debounce) — it is an explicit user action, not continuous typing. Uses the `content` already loaded by `useFileContent(filePath)`.

---

## 5. Remark Wiki Link Plugin (`remark-wiki-link.ts`)

Visits `text` nodes in the AST. Splits text around `[[...]]` matches and produces an array of `text` and `wikiLink` nodes:

```
"see [[my note]] for details"
→ [Text("see "), WikiLink("my note"), Text(" for details")]
```

The `wikiLink` node type is registered so react-markdown can route it to the custom `wikiLink` component. Uses `unist-util-visit` (already a transitive dependency of remark).

Resolution of the wiki link path uses `resolveWikiLink(value)` from `shared/file.store` — same as the CodeMirror click handler.

---

## 6. Preview Styles (theme.ts)

New `.md-preview` class added to `buildEditorTheme()`:

| Selector | Style |
|---|---|
| `.md-preview h1`–`h6` | `Instrument Serif`, `--accent`, proportional sizes |
| `.md-preview p` | `--fg-secondary`, `line-height: 1.8` |
| `.md-preview strong` | `--fg`, `font-weight: 600` |
| `.md-preview em` | italic, `--fg-secondary` |
| `.md-preview code` | `Geist Mono`, bg `--surface-2`, border `--border`, `--accent` |
| `.md-preview pre` | bg `--surface`, border `--border`, `border-radius: 8px`, padding |
| `.md-preview blockquote` | `border-left: 2px solid --accent`, `--fg-muted`, italic |
| `.md-preview a` | `--accent`, `border-bottom: 1px solid --accent-dim` |
| `.md-preview .preview-wikilink` | `--fg-secondary`, `border-bottom: 1px dashed --border`, cursor pointer |
| `.md-preview ul/ol` | standard indent, marker `--fg-muted` |
| `.md-preview hr` | `border-top: 1px solid --border` |
| `.md-preview table` | reuses `.cm-md-table` styles already in theme |

Checkbox icons inherit `vertical-align: middle` and `cursor: pointer` via `.md-preview .preview-checkbox`.

---

## 7. New Dependencies

| Package | Version | Purpose |
|---|---|---|
| `react-markdown` | `^9.x` | Markdown → React elements |
| `remark-gfm` | `^4.x` | GFM: tables, checkboxes, strikethrough |

`unist-util-visit` is already a transitive dependency of remark — no explicit install needed.

---

## 8. Extensibility

Future views (e.g., "Apresentação", "Foco") are added as new entries in the `ViewToggle` — `viewMode` type expands from `'edit' | 'read'` to include new values, and `MarkdownEditor` routes accordingly. The segmented control scales horizontally.

Custom markdown syntax is added as remark plugins in `MarkdownPreview`'s `remarkPlugins` array, with a matching entry in the `components` map.
