# Study MD

Editor e leitor de notas markdown similar ao Obsidian, com interface dark mode e syntax highlighting em tempo real.

## Stack

- **Frontend**: React 19 + TypeScript + Vite 7 + Tailwind CSS v4 + CodeMirror 6
- **Backend**: NestJS + Node.js (via tsx)

Sempre utilize o comando `nvm use` antes de começar para garantir que a versão correta do Node.

Sempre utilize o `pnpm` ao invés do `npm`

## Estrutura

Arquitetura **feature-based com colocation**: cada feature agrupa componentes, stores e testes no mesmo diretorio. `shared/` contem codigo reutilizado entre features.

```
client/src/
  app/
    App.tsx                # Layout principal + inicializacao do CommandRegistry

  features/
    panes/                 # Gerenciamento de paineis e tabs
      pane-controller.store.ts  # Zustand store (panes, tabs, URL routing)
      types.ts             # Tab, Pane, AppState
      SplitView.tsx        # Flex container de PaneViews + ResizeHandle
      PaneView.tsx         # Pane individual: TabBar + EditorContainer + drop zones
      TabBar.tsx           # Barra de abas: tabs arrastaveis, botao split, fechar pane
      EditorContainer.tsx  # Router: seleciona MarkdownEditor, PdfViewer ou NewTabScreen
      NewTabScreen.tsx     # Tela placeholder para tab vazia

    markdown-editor/       # Editor CodeMirror
      MarkdownEditor.tsx   # Editor; carrega arquivo e faz auto-save
      setup.ts             # Configuracao do CodeMirror (extensions, keybindings)
      theme.ts             # Tema dark Catppuccin/Obsidian
      keybindings.ts       # Atalhos de edicao markdown (Ctrl+B, Ctrl+I, etc.)
      markdown-widgets.ts  # Decoracoes de syntax highlighting para markdown

    pdf-viewer/            # Visualizador de PDF
      PdfViewer.tsx        # Orquestrador: split view PDF + notas; highlights; citacoes
      PdfRenderer.tsx      # Wrapper do react-pdf-highlighter
      PdfController.tsx    # Toolbar: navegacao de pagina, zoom, TOC toggle
      PdfNotesEditor.tsx   # Editor markdown independente para notas do PDF
      PdfHighlightMenu.tsx # ColorPicker, HighlightActionMenu
      pdf.store.ts         # Store custom (observer) para highlight alvo

    sidebar/               # Arvore de arquivos
      Sidebar.tsx          # Container redimensionavel (180-500px)
      FileTree.tsx         # Arvore hierarquica de arquivos
      FileTreeItem.tsx     # Item individual (draggable, expandavel)
      ContextMenu.tsx      # Menu de contexto generico (portal, posicao fixa)
      sidebar.store.ts     # Zustand store (expandedDirs)

    command-palette/       # Busca de arquivos
      CommandRegistry.ts   # Registry de comandos globais com atalhos de teclado
      OpenFilePalette.tsx  # Dialog de busca fuzzy (Ctrl+O)
      fuzzy-match.ts       # Fuzzy match por subsequencia + scoring

    translation/           # Traducao via LLM
      TranslationDialog.tsx # Dialog de traducao
      translation.service.ts # Cliente HTTP para API de traducao

  shared/
    services/
      filesystem.ts        # Interface FileSystemService + HttpFileSystemService + singleton fs
    ui/                    # Componentes reutilizaveis do shadcn
      button.tsx
      command.tsx
      dialog.tsx
      lib/utils.ts
    types.ts               # FileTreeEntry, FileContent
    file.store.ts          # Zustand store para arvore de arquivos + operacoes CRUD

server/
  main.ts                 # Bootstrap NestJS (porta 3000, prefixo /api, CORS)
  app.module.ts           # Modulo raiz (FilesystemModule, TranslateModule)
  filesystem/
    filesystem.module.ts  # NestJS module
    filesystem.controller.ts # REST endpoints de arquivos
    filesystem.service.ts    # Logica de arquivos + protecao contra path traversal
  translate/
    translate.module.ts   # NestJS module
    translate.controller.ts # POST /translate e /translate/examples
    translate.service.ts    # Logica de traducao via LLM + extractJson()
  llm/
    llm.module.ts         # NestJS module
    llm.service.ts        # LLMProvider interface + OpenRouterProvider + factory

docs/                     # Diretorio raiz das notas markdown e PDFs
```

## Comandos

- `pnpm run dev` — Inicia servidor NestJS + Vite dev (porta 3000)
- `pnpm run build` — Build de producao
- `pnpm run preview` — Preview do build

## API

- `GET /api/files` — Lista arvore de arquivos (`.md` e `.pdf`)
- `GET /api/files/raw/*` — Serve arquivo binario diretamente (para PDFs)
- `GET /api/files/*` — Le conteudo de um arquivo
- `PUT /api/files/*` — Atualiza conteudo (`{ content }`)
- `POST /api/files/*` — Cria arquivo ou diretorio (`{ type, content? }`)
- `PATCH /api/files/*` — Renomeia arquivo (`{ newName }` → `{ newPath }`)
- `POST /api/files/move` — Move arquivo (`{ sourcePath, targetDir }` → `{ newPath }`)
- `POST /api/files/duplicate` — Duplica arquivo (`{ sourcePath }` → `{ newPath }`)
- `POST /api/files/untitled` — Cria arquivo sem titulo (`{ dir }` → `{ path }`)
- `DELETE /api/files/*` — Remove arquivo ou diretorio
- `POST /api/translate` — Traduz texto (`{ text, from?, to? }` → `{ translation }`)
- `POST /api/translate/examples` — Retorna exemplos de uso (`{ text, from?, to? }` → `{ examples: [{original, translation}] }`)

## Gerenciamento de Estado

O app usa **multiplos Zustand stores** apos migracao do observer pattern customizado:

### Stores

| Store | Arquivo | Estado | API (`actions`) |
| ----- | ------- | ------ | --------------- |
| Pane controller | `features/panes/pane-controller.store.ts` | `panes`, `activePaneId`, `activeFile` | `openFileInPane`, `splitPane`, `moveTabToPane`, `updateTabPaths`, `removeTabPath` |
| File store | `shared/file.store.ts` | `fileTree: FileTreeEntry[]` | `loadFileTree`, `createFile`, `renameFile`, `moveFile`, `duplicateFile`, `deleteFile` |
| Sidebar | `features/sidebar/sidebar.store.ts` | `expandedDirs: Set<string>` | `toggleFolder`, `expandFolder`, `expandManyFolders` |
| PDF highlight | `features/pdf-viewer/pdf.store.ts` | `highlightTarget: string \| null` | `setTarget(id)`, `clearTarget()` |

Todos os Zustand stores usam o padrao `actions` (objeto estavel dentro do `create()`, nunca re-criado). O `pdf.store.ts` usa observer pattern customizado (nao Zustand) por simplicidade.

IO puro (`fs.readFile`, `fs.writeFile`) e acessado via singleton `fs` exportado de `shared/services/filesystem.ts` — nao pertence ao store.

### Modelo de dados

```typescript
// shared/types.ts
FileTreeEntry { name, path, type: "file" | "directory", children? }
FileContent   { content, path }

// features/panes/types.ts
Tab      { id, path: string | null }            // null = tab vazia (NewTabScreen)
Pane     { id, tabs, activeTabId, flexRatio }    // flexRatio = largura proporcional
AppState { activeFile, panes: Pane[], activePaneId }
```

### Pane Controller Store (`pane-controller.store.ts`)

- `commit()` privado no closure — deriva `activeFile` + faz `history.pushState()`
- `actions.openFileInPane(path, paneId?)` — cria nova tab ou ativa existente
- `actions.openNewTab(paneId?)` — cria tab vazia (path = null)
- `actions.closeTab(tabId, paneId)` — se ultima tab com N>1 panes → fecha o pane
- `actions.splitPane(paneId, 'left'|'right', copyTab?)` — retorna novo paneId
- `actions.closePane(paneId)` — remove pane, distribui ratio ao vizinho
- `actions.resizePane(leftId, rightId, newLeft, newRight)` — ajusta ratios
- `actions.moveTabToPane(tabId, fromId, toId, index?)` — move tab entre panes
- `actions.updateTabPaths(oldPath, newPath)` — atualiza path em todas as tabs (usado por renameFile/moveFile)
- `actions.removeTabPath(path)` — remove tabs com esse path (usado por deleteFile)

### File Store (`file.store.ts`)

- `actions.loadFileTree()` — busca arvore de arquivos via HTTP
- `actions.createFile/createUntitledFile/createDirectory` — CRUD + recarrega tree
- `actions.renameFile/moveFile/duplicateFile/deleteFile` — CRUD + chama `updateTabPaths`/`removeTabPath` no pane controller
- Selectors exportados: `resolveFileFromPath(path)`, `resolveWikiLink(linkPath)`

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

| Tipo                     | Decoracao                              | Comportamento                                                                   |
| ------------------------ | -------------------------------------- | ------------------------------------------------------------------------------- |
| Headings (`#`..`######`) | `mark` + `cm-md-header-N`              | Esconde `#` quando cursor fora da linha                                         |
| Bold/Italic              | `mark` + `cm-md-bold`/`cm-md-italic`   | Esconde `**`/`*` quando cursor fora                                             |
| Inline code              | `mark` + `cm-md-code`                  | Esconde backticks quando cursor fora                                            |
| Code blocks              | `line` + `cm-md-codeblock-line`        | Bloco visual com CSS counters para line numbers, widget para label da linguagem |
| Links                    | `mark` + `cm-md-link`                  | Esconde `[](url)` mostrando apenas o texto, clique abre URL externa em nova aba |
| Images                   | `widget` (ImageWidget, block)          | Renderiza `<img>` abaixo da sintaxe                                             |
| Wiki links               | `mark` + `cm-md-wikilink` (regex)      | Esconde `[[]]`, clique navega para nota                                         |
| Checkboxes               | `widget` (CheckboxWidget)              | Substitui `[x]`/`[ ]` por checkbox visual                                       |
| Horizontal rule          | `widget` (HorizontalRuleWidget, block) | Substitui `---` por `<hr>`                                                      |
| Blockquote               | `mark` + `cm-md-blockquote`            | Borda esquerda, esconde `>`                                                     |
| Strikethrough            | `mark` + `cm-md-strikethrough`         | Esconde `~~` quando cursor fora                                                 |

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

### Click handlers (markdown-widgets.ts)

Um unico `EditorView.domEventHandlers` (`linkClickHandler`) trata cliques em links:

- **Links externos** (`cm-md-link`): resolve o no `Link` na syntax tree, extrai a URL de `](url)` e abre com `window.open(url, "_blank", "noopener,noreferrer")`
- **Wiki links** (`cm-md-wikilink`): resolve via regex na linha e navega com `usePaneController.getState().actions.openFileInPane()`

### Command Palette (features/command-palette/)

Sistema de comandos globais com atalhos de teclado:

- `CommandRegistry` com `register()`, `init()` (listener global de `keydown`), `destroy()`
- Comando `open-file` (Ctrl+O / Cmd+O) abre o palette
- `OpenFilePalette.tsx`: portal em `document.body`, input com fuzzy search, navegacao por teclado (ArrowUp/Down/Enter/Escape)
- `fuzzy-match.ts`: achata file tree, fuzzy match por subsequencia com scoring (consecutivo, inicio de palavra, posicao)
- Highlight dos caracteres que deram match no nome do arquivo

### Atalhos de edicao markdown (keybindings.ts)

Keybindings do CodeMirror (`keymap.of()`) para formatacao de texto selecionado. Suportam toggle: se o texto ja esta formatado, remove a formatacao.

| Atalho        | Acao               | Marcador        |
| ------------- | ------------------ | --------------- |
| `Mod-b`       | Negrito            | `**texto**`     |
| `Mod-i`       | Italico            | `*texto*`       |
| `Mod-k`       | Link               | `[texto](url)`  |
| `Mod-Shift-k` | Codigo inline      | `` `texto` ``   |
| `Mod-Shift-x` | Tachado            | `~~texto~~`     |
| `Mod-Shift-7` | Lista ordenada     | `1. ` (prefixo) |
| `Mod-Shift-8` | Lista nao-ordenada | `- ` (prefixo)  |
| `Mod-Shift-9` | Blockquote         | `> ` (prefixo)  |

`Mod` = Ctrl no Linux/Windows, Cmd no Mac. `markdownKeymap` e inserido antes do `defaultKeymap` no setup para ter prioridade.

### Menu de contexto (Sidebar)

Clique direito na sidebar abre um `ContextMenu` (portal em `document.body`):

- **Area vazia ou diretorio**: opcoes "New file" e "New folder"
- **Arquivo**: opcoes "Duplicate", "Delete", "New file" e "New folder"
- Duplicacao usa numeracao incremental: `arquivo (1).md`, `arquivo (2).md`, etc. (backend verifica nomes existentes)
- `useFileStore.getState().actions.createDirectory()` expande os diretorios pai automaticamente

### Drag and drop (FileTreeItem + FileTree)

Arquivos e pastas podem ser movidos entre diretorios arrastando na sidebar:

- `FileTreeItem`: `draggable` em todos os itens, `onDrop` aceita apenas em diretorios
- `FileTree`: area raiz aceita drop para mover para o diretorio raiz (`docs/`)
- `useFileStore.getState().actions.moveFile(source, targetDir)` chama backend que verifica conflitos e impede mover diretorio para dentro de si mesmo
- Visual feedback: highlight `bg-accent/20` no diretorio alvo durante o drag

### Multi-tab e Split Pane (features/panes/)

O app suporta N paineis horizontais side-by-side, cada um com multiplas abas.

**Layout de panes** (`SplitView`):

```
SplitView (flex row)
  PaneView [flex: ratio]
    ResizeHandle (w-1, cursor-col-resize)
  PaneView [flex: ratio]
    ...
```

`ResizeHandle`: mousedown captura startX + ratios iniciais, mousemove calcula `ratioDelta = delta/containerWidth * totalRatio`, aplica via `actions.resizePane`.

**EditorContainer** roteia por tipo de arquivo:

- `.pdf` → `<PdfViewer />`
- `.md` → `<MarkdownEditor />`
- `null` (tab vazia) → `<NewTabScreen />`

**MarkdownEditor** (`MarkdownEditor.tsx`):

- Carrega conteudo via `fs.readFile()` no `useEffect([filePath])`
- `scheduleSave` local (1s debounce) chama `fs.writeFile()` diretamente
- `filePathRef` (ref) garante que o callback do CodeMirror sempre usa o path atual

**Drag and drop de tabs**:

- Tab drag: `dataTransfer.setData({ tabId, paneId })`
- Drop na TabBar: `moveTabToPane` (sem split)
- Drop na zona esq/dir do PaneView: `splitPane` + `moveTabToPane` para o novo pane
- Overlay visual (`bg-accent/15 border-accent`) indica o lado de drop

### Roteamento por URL (pane-controller.store + App.tsx)

O caminho do arquivo ativo e refletido na URL do navegador (sem a extensao `.md`):

- `commit()` (privado no closure do store) faz `history.pushState()` com o path (ex: `/notes/Getting Started`)
- `actions.removeTabPath()` reseta a URL para `/` quando o arquivo ativo e deletado
- Na inicializacao, `App.tsx` le `location.pathname` e abre o arquivo correspondente apos carregar a file tree
- `popstate` listener permite navegar entre notas com os botoes voltar/avancar do browser
- URL reflete sempre o arquivo ativo no **pane focado**; mudar `activePaneId` atualiza a URL

### Restricoes do CodeMirror 6

- `Decoration.mark()` exige `from < to` — guard `if (from >= to) return` evita crash em linhas vazias
- `Decoration.set(array, true)` com `true` para auto-sort, pois syntax tree nao garante ordem
- Block decorations (line, widget block) so funcionam via `StateField.provide()`, nao via ViewPlugin

### Visualizador de PDF (features/pdf-viewer/)

Arquivos `.pdf` em `docs/` aparecem na file tree com icone 📕. Usa a biblioteca `react-pdf-highlighter` (`PdfLoader` + `PdfHighlighter`).

**Infraestrutura**:

- **Servidor**: `GET /api/files/raw/*` serve arquivos binarios diretamente via `res.sendFile()`
- **Store**: `openFile()` apenas cria/ativa a tab — nao carrega conteudo (nem para `.md` nem `.pdf`)
- **EditorContainer**: recebe `filePath` como prop; quando termina em `.pdf`, renderiza `<PdfViewer>`
- **URL routing**: `openFileFromURL()` tenta resolver tanto `.md` quanto `.pdf` ao carregar a pagina

**Componentes do PdfViewer**:

- `PdfViewer.tsx` — orquestrador: layout split, estado de highlights, citacoes automaticas
- `PdfRenderer.tsx` — wrapper do `react-pdf-highlighter`; expoe ref do highlighter
- `PdfController.tsx` — toolbar com navegacao de pagina, zoom e TOC toggle
- `PdfNotesEditor.tsx` — editor markdown independente para notas; auto-save 1s
- `PdfHighlightMenu.tsx` — `ColorPicker`, `HighlightActionMenu`, `TranslationDialog`

**Layout**:

- Split view: area do PDF (esquerda, flexivel) + painel de notas redimensionavel (direita, 400px default)
- Toolbar 3 colunas: [TOC toggle] | [navegacao de pagina centralizada] | [controles de zoom]
- TOC sidebar opcionalmente visivel (225px), populada via `pdfDocument.getOutline()`

**Navegacao e rastreamento de pagina**:

- Page tracking via **scroll event listener** no container `.PdfHighlighter` (substituiu IntersectionObserver, que falhava com virtualizacao do PDF.js). `MutationObserver` aguarda o container aparecer no DOM e anexa o listener.
- `scrollToPage(n)` usa `highlighterRef.current.viewer.scrollPageIntoView({ pageNumber })` — API interna do PDF.js via ref no `PdfHighlighter`. Evita o `querySelector` que falha quando a pagina nao esta no DOM (virtualizacao) e nao dispara o ciclo de disconnect/reconnect que causava o warning de `createRoot`.
- Ao clicar em link `pdf-highlight://uuid` nas notas, `currentPage` e `pageInput` sao atualizados diretamente de `hl.position.pageNumber` (sem depender do scroll listener).
- Outline resolve destinos de pagina via `pdfDoc.getDestination()` + `pdfDoc.getPageIndex()`

**Controle de zoom**:

- `scale: number | null` — `null` = "auto" (PDF.js calcula fit-width no carregamento); torna-se numerico apos 150ms via leitura de `viewer.currentScale`, ou apos zoom explicito
- `pdfScaleValue={scale !== null ? String(scale) : "auto"}` e passado ao `PdfHighlighter`. Isso bloqueia o `ResizeObserver` interno da biblioteca (debounce 500ms) que chamava `handleScaleValue()` → `viewer.currentScaleValue = "auto"`, revertendo o zoom a cada resize de componente vizinho (painel de notas, menu de selecao)
- `applyZoom(newScale)` — clamp [0.1, 5.0], arredonda 2 casas, atualiza `scale` + `viewer.currentScaleValue`
- Ctrl+wheel: listener `wheel` com `passive: false` no `pdfWrapperRef`; le `viewer.currentScale` como base, aplica delta ±0.1
- Toolbar: lupa− | `[input]%` | lupa+ | botao "reset" (volta para 100%)
- `zoomInput` state (string) + `zoomEditingRef` (ref booleano): sync `scale → zoomInput` via `useEffect` apenas quando input nao esta focado; `onFocus` seleciona tudo; `onBlur`/Enter valida (10–500%) e aplica; Escape descarta sem aplicar
- Scroll horizontal disponivel automaticamente quando zoom extrapola a largura: o container interno do `PdfHighlighter` ja tem `overflow: auto`

**Dependencia critica**:

- `pdfjs-dist` pinado em `4.4.168` (peer dep exata de `react-pdf-highlighter@8.0.0-rc.0`). A biblioteca hardcoda o worker URL para essa versao em `https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`. Versoes superiores (ex: v5) causam "Junk found after end of compressed data" (worker vs modulo principal em versoes diferentes) e warnings de `createRoot` (API de paginas do PDF.js mudou, quebrando o ciclo de highlight layers).

**Highlights**:

- Cores disponiveis: `yellow`, `green`, `blue`, `pink` (RGBA com alpha 0.45 via `HIGHLIGHT_COLORS`)
- Persistencia em `highlights-<nome>.json` no mesmo diretorio do PDF
- `ColorPicker` (em `PdfHighlightMenu.tsx`): aparece ao selecionar texto, permite escolher cor antes de criar o highlight
- `HighlightActionMenu` (em `PdfHighlightMenu.tsx`): aparece ao clicar num highlight existente, permite trocar cor ou deletar
- `highlight.comment.emoji` armazena o id da cor (campo reutilizado da API)
- Highlight com pulso visual (`pdf-highlight-pulse`) quando scrollado via link

**Citacoes automaticas**:

- Ao criar highlight com texto, `buildCitation()` insere blockquote no editor de notas:
  ```
  > texto selecionado
  >
  > — [p. 42](pdf-highlight://uuid)
  ```
- Links `pdf-highlight://uuid` no editor markdown sao interceptados por `linkClickHandler` em `markdown-widgets.ts` e disparam `pdfStore.setTarget(id)` (via dynamic import), que faz o `PdfViewer` scrollar ate o highlight correspondente via `scrollViewerTo.current(hl)`

**Notas do PDF**:

- Arquivo `notes-<nome>.md` criado automaticamente no mesmo diretorio, com frontmatter `pdf: "[[path]]"` vinculando ao PDF
- Qualquer nota `.md` pode ser vinculada a um PDF adicionando `pdf: "[[path]]"` no frontmatter
- Auto-save com debounce de 1s via instancia independente de `createEditor`

**Estado no pdf-store** (`pdfHighlightTarget: string | null`):

- `pdfStore.setTarget(id)` — define o highlight alvo
- `pdfStore.clearTarget()` — limpa apos o scroll ser executado

**Traducao e exemplos** (`server/llm/` + `server/translate/` + `features/translation/`):

- `LLMProvider` interface com `complete(prompt): Promise<string>` — permite adicionar novos provedores (ex: Ollama) sem mudar o resto
- `OpenRouterProvider` implementa a interface; modelo default `google/gemma-3n-e2b-it:free`; requer `OPEN_ROUTER_API_KEY` no `.env`
- `LlmService.getProvider()` factory — ponto unico para trocar de provedor no futuro
- `POST /api/translate` — traduz texto livre via LLM
- `POST /api/translate/examples` — pede 3 frases de exemplo em JSON; `extractJson()` lida com fences de markdown e texto extra ao redor do array
- Frontend: `translateText()` e `getExamples()` em `features/translation/translation.service.ts`
- `TranslationDialog` (em `features/translation/`): portal fixo que bloqueia `mousedown` e `click` no backdrop para impedir que o listener do `react-pdf-highlighter` (registrado no `document`) desmonte o tip e feche o dialog; fecha apenas pelo botao X ou "Fechar"
- Botao "Exemplos" no rodape do dialog — busca exemplos somente quando clicado (nao na abertura); exibe original + traducao em cards separados
- Tanto `ColorPicker` (selecao nova) quanto `HighlightActionMenu` (highlight existente) expoe o botao "Traduzir"

## Convencoes

- Arquivos `.md` e `.pdf` sao processados
- Arquivos ficam em `docs/`
- Tema dark com paleta Catppuccin Mocha
- Path aliases: `@app/` → `client/src/app/`, `@features/` → `client/src/features/`, `@shared/` → `client/src/shared/`
- NestJS backend: controllers usam decorators `@Get`, `@Put`, `@Post`, `@Patch`, `@Delete`; servicos sao `@Injectable()`