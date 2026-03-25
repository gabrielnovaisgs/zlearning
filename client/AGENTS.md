# Client — AGENTS.md

Contexto específico do frontend. Leia também o `AGENTS.md` da raiz.

## Tokens de cor

**Nunca use** `bg-primary`, `text-primary`, `bg-muted`, etc. Use sempre os tokens semânticos do projeto (`bg-bg`, `text-fg`, `text-accent`, etc.). Ver tabela completa no AGENTS.md raiz.

Cores hardcoded (ex: `#cba6f7`) são aceitáveis **apenas** dentro de `features/markdown-editor/theme.ts` para syntax highlighting do CodeMirror, pois aquele contexto não tem acesso ao CSS.

## CodeMirror 6 — constraints não-óbvias

- **Block decorations** (`Decoration.line()` e widgets com `block: true`) só funcionam via `StateField.provide()` — não via `ViewPlugin`. A arquitetura atual usa `StateEffect → StateField → EditorView.decorations.from()` exatamente por isso.
- **`Decoration.mark()`** exige `from < to`. Sempre guarde com `if (from >= to) return` antes de criar marks (linhas vazias causam crash sem esse guard).
- **`Decoration.set(array, true)`** — o segundo argumento `true` força auto-sort. Necessário porque a syntax tree não garante ordem.
- **`cm-md-hide`** (`font-size: 0`) é o mecanismo para ocultar marcadores de sintaxe quando o cursor está fora da linha. Não use `display: none` (quebra posicionamento do cursor).

## Stores Zustand

| Store | Arquivo |
|-------|---------|
| Pane controller | `features/panes/pane-controller.store.ts` |
| File store | `shared/file.store.ts` |
| File explorer | `features/file-explorer/file-explorer.store.ts` |
| Sidebar (expandedDirs) | — removido, incorporado ao file-explorer |
| PDF highlight target | `features/pdf-viewer/pdf.store.ts` (observer pattern, não Zustand) |
| Config | `features/config/config.store.ts` |
| Theme | `features/theme/theme.store.ts` |

IO puro (`readFile`, `writeFile`) é feito via singleton `fs` de `shared/services/filesystem.ts` — não pertence a nenhum store.

## pdfjs-dist — versão pinada

`pdfjs-dist` está pinado em exatamente **`4.4.168`** (sem `^`). Não atualize.

A biblioteca `react-pdf-highlighter@8.0.0-rc.0` hardcoda a URL do worker para essa versão específica. Versões superiores causam "Junk found after end of compressed data" (incompatibilidade worker/módulo) e warnings de `createRoot`.

## Wiki links

Detectados por regex (`/\[\[([^\]]+)\]\]/g`) porque o parser markdown não os reconhece nativamente. Usam caminho completo como referência (ex: `[[notes/Getting Started]]`) para evitar ambiguidade entre arquivos com mesmo nome em pastas diferentes.
