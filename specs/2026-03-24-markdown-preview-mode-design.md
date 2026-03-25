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
  preview.css             — global prose styles for .md-preview
```

### Modified files

```
  MarkdownEditor.tsx      — adds viewMode state, ViewToggle, conditional rendering
```

### Layout

```
┌─────────────────────────────────────────────────────┐
│ [sticky bar, outside scroll]    ViewToggle (top-right)│
├─────────────────────────────────────────────────────┤
│ ↕ scroll                                            │
│   EditableTitle  (always visible in both modes)     │
│   CodeMirror div (display:none in read mode)        │
│   MarkdownPreview (hidden in edit mode)             │
└─────────────────────────────────────────────────────┘
```

### State

`viewMode: 'edit' | 'read'` lives as local `useState` in `MarkdownEditor` — it is pure UI state, no store needed.

**Mode reset on file switch:** A `useEffect([filePath])` resets `viewMode` to `'edit'` whenever `filePath` changes. This ensures a fresh note always opens in edit mode.

The CodeMirror editor is **never destroyed** when switching modes. It is hidden via `display: none` (removes from layout, preserves React state) to preserve undo history and cursor position. `EditableTitle` and `isLoading` overlay remain visible and functional in both modes.

---

## 2. ViewToggle Component

Segmented control with two buttons using `lucide-react` icons:

- **Editar** — `<Pencil size={13} />` — active when `viewMode === 'edit'`
- **Leitura** — `<Eye size={13} />` — active when `viewMode === 'read'`

Active button: `background: var(--surface)`, `color: var(--accent)`.
Inactive button: `color: var(--fg-muted)`.
Container: `background: var(--surface-2)`, `border: 1px solid var(--border)`, `border-radius: 6px`.

The toggle bar is rendered **outside** the scroll container (sticky), aligned to the right within the same `max-width: 800px` column as the editor content.

**Accessibility:** container has `role="group"` and `aria-label="Modo de visualização"`. Each button has `aria-pressed={active}`.

---

## 3. MarkdownPreview Component

```tsx
interface Props {
  content: string;
  filePath: string;
  onCheckboxToggle: (index: number, checked: boolean) => void;
}
```

**Content source:** When the user toggles to read mode, `MarkdownEditor` snapshots `editorRef.current.getContent()` into a `readContent` state and passes it as the `content` prop. This ensures the preview always reflects the latest typed content — not the React Query cache, which can lag by up to 1 second (the debounce window). `readContent` is updated on every transition to `'read'` mode.

Uses `react-markdown` with:
- `remarkPlugins={[remarkGfm, remarkWikiLink]}`
- Custom `components` for: `input`, `a`, `img`, `span`

Wrapped in `<div className="md-preview">` — same max-width and padding as CodeMirror content area (`max-width: 800px; margin: 0 auto; padding: 8px 48px 24px`).

**Frontmatter:** The `content` string is stripped of YAML frontmatter before being passed to `react-markdown`. Strip condition: `content.startsWith('---\n')` — only strip if the file starts with a frontmatter fence, to avoid treating a mid-document `---` (horizontal rule) as a frontmatter block. Everything up to and including the closing `---\n` is removed.

### Custom component: checkbox (`input`)

Replaces `<input type="checkbox">` with a Lucide icon pair:
- Unchecked: `<Square size={15} />` — `color: var(--border)`
- Checked: `<SquareCheck size={15} />` — `color: var(--accent)`

Index tracked via `useRef` counter (`checkboxIndexRef`) that resets on each render and increments per checkbox. On click, calls `onCheckboxToggle(idx, !checked)`.

### Custom component: wiki links (`span`)

The remark plugin produces `wikiLink` MDAST nodes with `data.hName: 'span'` and `data.hProperties: { 'data-wikilink': 'note name' }`. `remark-rehype` (used internally by `react-markdown`) normalizes `data-wikilink` to `dataWikilink` in `node.properties`.

The `span` component handler checks for this property and renders the navigation element:

```tsx
span: ({ node, children, ...props }) => {
  const wikiLinkValue = node?.properties?.dataWikilink as string | undefined;
  if (wikiLinkValue) {
    return (
      <span
        {...props}
        className="preview-wikilink"
        onClick={(e) => {
          const path = resolveWikiLink(wikiLinkValue);
          if (!path) return;
          if (e.ctrlKey || e.metaKey) {
            const newPaneId = splitPane(activePaneId, 'right');
            openFileInPane(path, newPaneId);
          } else {
            openFileInPane(path);
          }
        }}
      >
        {children}
      </span>
    );
  }
  return <span {...props}>{children}</span>;
}
```

`activePaneId` is read from `usePaneController`.

### Custom component: links (`a`)

Three cases resolved in order:

1. **`pdf-highlight://uuid`** — calls `pdfStore.setTarget(id)` via dynamic import
2. **Internal `.md` links** — `href` ending in `.md` or matching a known file path resolves via `resolveFileFromPath` from `shared/file.store` and navigates via `openFileInPane` (same Ctrl+click behaviour as wiki links for new pane)
3. **External links** — `window.open(url, '_blank', 'noopener,noreferrer')`

### Custom component: images (`img`)

Relative image paths (e.g., `docs/image.png`) are prefixed with `/api/files/raw/` to resolve against the file server:

```tsx
img: ({ src, alt }) => {
  const resolvedSrc = src?.startsWith('http') ? src : `/api/files/raw/${src}`;
  return <img src={resolvedSrc} alt={alt} className="md-preview-img" />;
}
```

---

## 4. Checkbox Save Mechanism

`handleCheckboxToggle(index: number, checked: boolean)` in `MarkdownEditor`:

```
1. Read current content from editorRef.current.getContent()
   — uses the live CodeMirror document, not the React Query cache,
     avoiding the stale-data race condition with debounced saves.
2. Split by '\n'
3. Walk lines, count task items matching /^(\s*[-*+]\s+)\[[ x]\]/i
4. On the Nth match, replace [ ] / [x] with the new state
5. Join lines and call fs.writeFile(filePath, newContent)
6. Also cancel any pending debounced save (clear saveTimeoutRef)
   and update the editor content via editorRef.current.setContent(newContent)
   so edit mode stays in sync.
```

Save is **immediate** (no debounce) — it is an explicit user action. Reading from `editorRef.current.getContent()` guarantees we work with the latest typed content even if the debounced save hasn't fired yet.

After writing, the CodeMirror instance is updated to stay in sync. The `setContent` call must be wrapped with the `isExternalUpdate` guard (already used in `MarkdownEditor.tsx`) to prevent the `updateListener` from re-queueing a redundant debounced save:

```ts
clearTimeout(saveTimeoutRef.current);
fs.writeFile(filePath, newContent);
isExternalUpdate.current = true;
editorRef.current.setContent(newContent);
isExternalUpdate.current = false;
```

The checkbox regex covers both unordered and ordered list markers: `/^(\s*(?:[-*+]|\d+\.)\s+)\[[ x]\]/i`.

---

## 5. Remark Wiki Link Plugin (`remark-wiki-link.ts`)

Visits `text` nodes in the MDAST using `unist-util-visit`. Splits text around `[[...]]` matches and replaces the text node with an array of plain `text` nodes and custom `wikiLink` nodes constructed as plain object literals:

```ts
{ type: 'wikiLink', value: 'note name', data: { hName: 'span', hProperties: { 'data-wikilink': 'note name' } } }
```

The `data.hName` and `data.hProperties` fields are the standard remark convention for instructing `remark-rehype` how to serialize a custom node to hast — no separate rehype plugin is needed. `react-markdown` (which uses `remark-rehype` internally) will produce a `<span data-wikilink="note name">` element, which the `components` map handles.

Example transform:

```
"see [[my note]] for details"
→ [Text("see "), WikiLink("my note"), Text(" for details")]
→ <span>see </span><span data-wikilink="my note">my note</span><span> for details</span>
```

Node construction uses plain object literals — no `unist-builder` required. `unist-util-visit` is a transitive dependency of remark (no explicit install needed).

Resolution of the wiki link path uses `resolveWikiLink(value)` from `shared/file.store`.

---

## 6. Preview Styles (`preview.css`)

A dedicated `preview.css` file is imported in `MarkdownPreview.tsx`. It uses CSS custom properties (`var(--accent)`, etc.) defined at `:root` level in `index.css` — these are available globally and not scoped to CodeMirror.

| Selector | Style |
|---|---|
| `.md-preview h1`–`h6` | `Instrument Serif`, `var(--accent)`, proportional sizes |
| `.md-preview p` | `var(--fg-secondary)`, `line-height: 1.8` |
| `.md-preview strong` | `var(--fg)`, `font-weight: 600` |
| `.md-preview em` | italic, `var(--fg-secondary)` |
| `.md-preview code` | `Geist Mono`, bg `var(--surface-2)`, border `var(--border)`, color `var(--accent)` |
| `.md-preview pre` | bg `var(--surface)`, border `var(--border)`, `border-radius: 8px`, padding |
| `.md-preview blockquote` | `border-left: 2px solid var(--accent)`, `var(--fg-muted)`, italic |
| `.md-preview a` | `var(--accent)`, `border-bottom: 1px solid var(--accent-dim)` |
| `.md-preview .preview-wikilink` | `var(--fg-secondary)`, `border-bottom: 1px dashed var(--border)`, cursor pointer |
| `.md-preview ul/ol` | standard indent, marker `var(--fg-muted)` |
| `.md-preview hr` | `border-top: 1px solid var(--border)` |
| `.md-preview table` | same visual as `.cm-md-table` (border-collapse, header bg `var(--surface-2)`) |
| `.md-preview-img` | `max-width: 100%`, `border-radius: 8px`, `margin: 8px 0` |
| `.md-preview .preview-checkbox` | `vertical-align: middle`, `cursor: pointer` |

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

Custom markdown syntax is added as remark plugins in `MarkdownPreview`'s `remarkPlugins` array. The `data.hName` + `data.hProperties` convention on custom MDAST nodes is the standard extension point — no rehype plugin required for most cases.
