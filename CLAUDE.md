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

## Convencoes

- Apenas arquivos `.md` sao processados
- Arquivos ficam em `docs/`
- Tema dark com paleta Catppuccin
- Path aliases: `@/` mapeia para `src/`
