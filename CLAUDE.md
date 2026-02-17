# Study MD

Editor e leitor de notas markdown similar ao Obsidian, com interface dark mode e syntax highlighting em tempo real.

## Stack

- **Frontend**: React 19 + TypeScript + Vite 7 + Tailwind CSS v4 + CodeMirror 6
- **Backend**: Express 5 + Node.js (via tsx)

## Estrutura

```
src/
  core/
    store.ts          # Estado global (observer pattern) com auto-save (1s debounce)
    types.ts          # Tipos TypeScript (FileTreeEntry, FileContent, AppState)
    services/
      filesystem.ts   # Cliente HTTP para API de arquivos
    editor/
      setup.ts        # Configuracao do CodeMirror (markdown, history, brackets)
      theme.ts        # Tema dark Catppuccin/Obsidian
      markdown-widgets.ts  # Decoracoes de syntax highlighting para markdown
  views/
    App.tsx           # Layout principal
    Editor/
      EditorContainer.tsx  # Container do editor CodeMirror
    Sidebar/
      Sidebar.tsx     # Navegacao lateral redimensionavel
      FileTree.tsx    # Arvore hierarquica de arquivos
      FileTreeItem.tsx # Item individual da arvore
    hooks.ts          # useStore() hook para sincronizar com store externo
server/
  index.ts            # Express + Vite dev middleware (porta 3000)
  routes/
    filesystem.ts     # API REST de arquivos (CRUD em docs/) com protecao contra path traversal
docs/                 # Diretorio raiz das notas markdown
```

## Comandos

- `npm run dev` — Inicia servidor Express + Vite dev (porta 3000)
- `npm run build` — Build de producao
- `npm run preview` — Preview do build

## API

- `GET /api/files` — Lista arvore de arquivos markdown
- `GET /api/files/*` — Le conteudo de um arquivo
- `PUT /api/files/*` — Atualiza conteudo de um arquivo
- `POST /api/files/*` — Cria arquivo ou diretorio
- `DELETE /api/files/*` — Remove arquivo ou diretorio

## Arquitetura do Editor Markdown

### Decoracoes (markdown-widgets.ts)

O sistema de live preview usa **StateField + StateEffect + updateListener** do CodeMirror 6. Essa arquitetura foi escolhida porque ViewPlugin nao suporta block decorations (widgets com `block: true` e `Decoration.line()`).

```
StateEffect (setDecorations) → StateField (decorationField) → EditorView.decorations.from()
                                        ↑
                          updateListener (recalcula em docChanged/selectionSet)
```

**Fluxo**: a cada mudanca de documento ou selecao, `buildDecorations()` percorre a syntax tree e gera decoracoes, que sao enviadas via `StateEffect` ao `StateField`.

### Tipos de decoracao

| Tipo | Decoracao | Comportamento |
|------|-----------|---------------|
| Headings (`#`..`######`) | `mark` + `cm-md-header-N` | Esconde `#` quando cursor fora da linha |
| Bold/Italic | `mark` + `cm-md-bold`/`cm-md-italic` | Esconde `**`/`*` quando cursor fora |
| Inline code | `mark` + `cm-md-code` | Esconde backticks quando cursor fora |
| Code blocks | `line` + `cm-md-codeblock-line` | Bloco visual com CSS counters para line numbers, widget para label da linguagem |
| Links | `mark` + `cm-md-link` | Esconde `[](url)` mostrando apenas o texto |
| Images | `widget` (ImageWidget, block) | Renderiza `<img>` abaixo da sintaxe |
| Wiki links | `mark` + `cm-md-wikilink` (regex) | Esconde `[[]]`, clique navega para nota |
| Checkboxes | `widget` (CheckboxWidget) | Substitui `[x]`/`[ ]` por checkbox visual |
| Horizontal rule | `widget` (HorizontalRuleWidget, block) | Substitui `---` por `<hr>` |
| Blockquote | `mark` + `cm-md-blockquote` | Borda esquerda, esconde `>` |
| Strikethrough | `mark` + `cm-md-strikethrough` | Esconde `~~` quando cursor fora |

### Comportamento de ocultacao

Marcadores de sintaxe sao tratados de forma diferente dependendo da posicao do cursor:
- **Cursor fora da linha**: marcadores ficam invisíveis (`cm-md-hide`: `font-size: 0`)
- **Cursor na linha**: marcadores ficam visíveis mas esmaecidos (`cm-md-syntax-dim`: cor `#585b70`)

### Wiki Links

Detectados por regex (`/\[\[([^\]]+)\]\]/g`) pois o parser markdown nao os reconhece nativamente. Usam caminho completo como referencia (ex: `[[notes/Getting Started]]`) para evitar ambiguidade entre arquivos com mesmo nome em pastas diferentes. O clique resolve o path via `store.resolveWikiLink()` que busca na file tree.

### Code Blocks

Blocos de codigo usam `Decoration.line()` por linha (nao mark) para criar visual de bloco com:
- Background `#181825` com border-radius no primeiro/ultimo conteudo
- Line numbers via CSS counters (`counter-reset`/`counter-increment`)
- Label da linguagem via widget absoluto posicionado no canto superior direito
- Syntax highlighting via `@codemirror/language-data` (deteccao automatica de linguagem)

### Restricoes do CodeMirror 6

- `Decoration.mark()` exige `from < to` — guard `if (from >= to) return` evita crash em linhas vazias
- `Decoration.set(array, true)` com `true` para auto-sort, pois syntax tree nao garante ordem
- Block decorations (line, widget block) so funcionam via `StateField.provide()`, nao via ViewPlugin

## Convencoes

- Apenas arquivos `.md` sao processados
- Arquivos ficam em `docs/`
- Tema dark com paleta Catppuccin Mocha
- Path aliases: `@/` mapeia para `src/`, `@core/` mapeia para `src/core/`
- Express 5: `req.params.splat` retorna array — sempre usar `.join("/")` para reconstruir paths
