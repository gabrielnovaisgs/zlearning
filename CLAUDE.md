# Study MD

Editor e leitor de notas markdown similar ao Obsidian, com interface dark mode e syntax highlighting em tempo real.

## Stack

- **Frontend**: React 19 + TypeScript + Vite 7 + Tailwind CSS v4 + CodeMirror 6
- **Backend**: Express 5 + Node.js (via tsx)

## Estrutura

```
src/
  core/
    store.ts          # Estado global (observer pattern); panes/tabs; auto-save por EditorContainer
    types.ts          # Tipos TypeScript (FileTreeEntry, FileContent, Tab, Pane, AppState)
    commands.ts       # Registry de comandos globais com atalhos de teclado (Ctrl+O, etc.)
    services/
      filesystem.ts   # Cliente HTTP para API de arquivos
    editor/
      setup.ts        # Configuracao do CodeMirror (markdown, history, brackets, keybindings)
      theme.ts        # Tema dark Catppuccin/Obsidian
      keybindings.ts  # Atalhos de edicao markdown (Ctrl+B, Ctrl+I, etc.)
      markdown-widgets.ts  # Decoracoes de syntax highlighting para markdown
  views/
    App.tsx           # Layout principal + inicializacao do CommandRegistry
    Editor/
      SplitView.tsx        # Flex container de PaneViews + ResizeHandle entre panes
      PaneView.tsx         # Pane individual: TabBar + EditorContainer + drop zones
      TabBar.tsx           # Barra de abas: tabs draggaveis, botao split, fechar pane
      EditorContainer.tsx  # Editor CodeMirror ou PdfViewer; recebe filePath/paneId/isFocused
      PdfViewer.tsx        # Split view: iframe PDF + painel de notas com editor independente
    Sidebar/
      Sidebar.tsx     # Navegacao lateral redimensionavel
      FileTree.tsx    # Arvore hierarquica de arquivos
      FileTreeItem.tsx # Item individual da arvore
    CommandPalette/
      CommandPalette.tsx  # Dialog de busca fuzzy de arquivos (Ctrl+O)
      fuzzy-match.ts     # Fuzzy match por subsequencia + flatten da file tree
    hooks.ts          # useStore() hook para sincronizar com store externo
    Sidebar/
      ContextMenu.tsx # Menu de contexto generico (portal, posicao fixa)
server/
  index.ts            # Express + Vite dev middleware (porta 3000)
  routes/
    filesystem.ts     # API REST de arquivos (CRUD em docs/) com protecao contra path traversal
    translate.ts      # POST /api/translate e POST /api/translate/examples (traducao via LLM)
  services/
    llm.ts            # Abstracao de provedores LLM (interface LLMProvider + OpenRouterProvider)
docs/                 # Diretorio raiz das notas markdown
```

## Comandos

- `npm run dev` — Inicia servidor Express + Vite dev (porta 3000) — carrega `.env` via `--env-file=.env`
- `npm run build` — Build de producao
- `npm run preview` — Preview do build

## API

- `GET /api/files` — Lista arvore de arquivos markdown
- `GET /api/files/*` — Le conteudo de um arquivo
- `PUT /api/files/*` — Atualiza conteudo de um arquivo
- `POST /api/files/*` — Cria arquivo ou diretorio
- `DELETE /api/files/*` — Remove arquivo ou diretorio
- `POST /api/translate` — Traduz texto (`{ text, from?, to? }` → `{ translation }`)
- `POST /api/translate/examples` — Retorna exemplos de uso (`{ text, from?, to? }` → `{ examples: [{original, translation}] }`)

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
| Links | `mark` + `cm-md-link` | Esconde `[](url)` mostrando apenas o texto, clique abre URL externa em nova aba |
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

### Click handlers (markdown-widgets.ts)

Um unico `EditorView.domEventHandlers` (`linkClickHandler`) trata cliques em links:
- **Links externos** (`cm-md-link`): resolve o no `Link` na syntax tree, extrai a URL de `](url)` e abre com `window.open(url, "_blank", "noopener,noreferrer")`
- **Wiki links** (`cm-md-wikilink`): resolve via regex na linha e navega com `store.openFile()`

### Command Palette (commands.ts + CommandPalette/)

Sistema de comandos globais com atalhos de teclado:
- `CommandRegistry` com `register()`, `init()` (listener global de `keydown`), `destroy()`
- Comando `open-file` (Ctrl+O / Cmd+O) abre o palette
- `CommandPalette.tsx`: portal em `document.body`, input com fuzzy search, navegacao por teclado (ArrowUp/Down/Enter/Escape)
- `fuzzy-match.ts`: achata file tree, fuzzy match por subsequencia com scoring (consecutivo, inicio de palavra, posicao)
- Highlight dos caracteres que deram match no nome do arquivo

### Atalhos de edicao markdown (keybindings.ts)

Keybindings do CodeMirror (`keymap.of()`) para formatacao de texto selecionado. Suportam toggle: se o texto ja esta formatado, remove a formatacao.

| Atalho | Acao | Marcador |
|--------|------|----------|
| `Mod-b` | Negrito | `**texto**` |
| `Mod-i` | Italico | `*texto*` |
| `Mod-k` | Link | `[texto](url)` |
| `Mod-Shift-k` | Codigo inline | `` `texto` `` |
| `Mod-Shift-x` | Tachado | `~~texto~~` |
| `Mod-Shift-7` | Lista ordenada | `1. ` (prefixo) |
| `Mod-Shift-8` | Lista nao-ordenada | `- ` (prefixo) |
| `Mod-Shift-9` | Blockquote | `> ` (prefixo) |

`Mod` = Ctrl no Linux/Windows, Cmd no Mac. `markdownKeymap` e inserido antes do `defaultKeymap` no setup para ter prioridade.

### Menu de contexto (Sidebar)

Clique direito na sidebar abre um `ContextMenu` (portal em `document.body`):
- **Area vazia ou diretorio**: opcoes "New file" e "New folder"
- **Arquivo**: opcoes "Duplicate", "Delete", "New file" e "New folder"
- Duplicacao usa numeracao incremental: `arquivo (1).md`, `arquivo (2).md`, etc. (`store.duplicateFile()` verifica nomes existentes no mesmo diretorio)
- `store.createDirectory()` expande os diretorios pai automaticamente

### Drag and drop (FileTreeItem + FileTree)

Arquivos e pastas podem ser movidos entre diretorios arrastando na sidebar:
- `FileTreeItem`: `draggable` em todos os itens, `onDrop` aceita apenas em diretorios
- `FileTree`: area raiz aceita drop para mover para o diretorio raiz (`docs/`)
- `store.moveFile(source, targetDir)` usa `fs.renameFile` para mover, verifica conflito de nomes e impede mover diretorio para dentro de si mesmo
- Visual feedback: highlight `bg-accent/20` no diretorio alvo durante o drag

### Multi-tab e Split Pane (SplitView + PaneView + TabBar + store)

O app suporta N paineis horizontais side-by-side, cada um com multiplas abas.

**Modelo de dados** (`types.ts`):
```typescript
Tab  { id, path }
Pane { id, tabs, activeTabId, flexRatio }   // flexRatio = largura proporcional no flex container
AppState.panes: Pane[]                       // lista ordenada esq→dir
AppState.activePaneId: string
AppState.activeFile: string | null           // derivado: active pane → active tab → path
```

**Store** (`store.ts`):
- `update()` deriva `activeFile` automaticamente a cada mudanca de estado
- `openFile(path, paneId?)` — cria nova tab ou ativa existente no pane alvo; nao carrega conteudo (EditorContainer faz isso localmente)
- `closeTab(tabId, paneId)` — se ultima tab com N>1 panes → fecha o pane
- `activateTab(tabId, paneId)` / `setActivePaneId(paneId)` — foco
- `splitPane(paneId, 'left'|'right')` — insere novo pane com `flexRatio = original/2`, copia a tab ativa; retorna o novo paneId
- `closePane(paneId)` — remove pane, distribui ratio ao vizinho adjacente
- `resizePane(leftId, rightId, newLeft, newRight)` — ajusta ratios dos dois panes ao arrastar handle
- `moveTabToPane(tabId, fromId, toId, index?)` — move tab entre panes; fecha fromPane se ficar vazio
- `renameFile`/`deleteFile`/`moveFile` atualizam `tab.path` em todos os panes

**EditorContainer** agora recebe props `{ filePath, paneId, isFocused }`:
- Gerencia conteudo localmente: `useEffect([filePath])` carrega via `store.fs.readFile()`
- `scheduleSave` local (1s debounce) chama `store.fs.writeFile()` diretamente
- `filePathRef` (ref) garante que o callback do CodeMirror sempre usa o path atual

**Layout de panes** (`SplitView`):
```
SplitView (flex row)
  PaneView [flex: ratio]
    ResizeHandle (w-1, cursor-col-resize)
  PaneView [flex: ratio]
    ...
```
`ResizeHandle`: mousedown captura startX + ratios iniciais, mousemove calcula `ratioDelta = delta/containerWidth * totalRatio`, aplica via `store.resizePane`.

**Drag and drop de tabs**:
- Tab drag: `dataTransfer.setData({ tabId, paneId })`
- Drop na TabBar: `moveTabToPane` (sem split)
- Drop na zona esq/dir do PaneView: `splitPane` + `moveTabToPane` para o novo pane
- Overlay visual (`bg-accent/15 border-accent`) indica o lado de drop

### Roteamento por URL (store.ts + App.tsx)

O caminho do arquivo ativo e refletido na URL do navegador (sem a extensao `.md`):
- `store.openFile()` faz `history.pushState()` com o path (ex: `/notes/Getting Started`)
- `store.deleteFile()` reseta a URL para `/` quando o arquivo ativo e deletado
- Na inicializacao, `App.tsx` le `location.pathname` e abre o arquivo correspondente apos carregar a file tree
- `popstate` listener permite navegar entre notas com os botoes voltar/avancar do browser
- URL reflete sempre o arquivo ativo no **pane focado**; mudar `activePaneId` atualiza a URL

### Restricoes do CodeMirror 6

- `Decoration.mark()` exige `from < to` — guard `if (from >= to) return` evita crash em linhas vazias
- `Decoration.set(array, true)` com `true` para auto-sort, pois syntax tree nao garante ordem
- Block decorations (line, widget block) so funcionam via `StateField.provide()`, nao via ViewPlugin

### Visualizador de PDF (PdfViewer.tsx + PdfHighlightMenu.tsx)

Arquivos `.pdf` em `docs/` aparecem na file tree com icone 📕. Usa a biblioteca `react-pdf-highlighter` (`PdfLoader` + `PdfHighlighter`).

**Infraestrutura**:
- **Servidor**: `GET /api/files/raw/*` serve arquivos binarios diretamente via `res.sendFile()`
- **Store**: `openFile()` apenas cria/ativa a tab — nao carrega conteudo (nem para `.md` nem `.pdf`)
- **EditorContainer**: recebe `filePath` como prop; quando termina em `.pdf`, renderiza `<PdfViewer>`
- **URL routing**: `openFileFromURL()` tenta resolver tanto `.md` quanto `.pdf` ao carregar a pagina

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
- Links `pdf-highlight://uuid` no editor markdown sao interceptados por `linkClickHandler` em `markdown-widgets.ts` e disparam `store.setPdfHighlightTarget(id)`, que faz o `PdfViewer` scrollar ate o highlight correspondente via `scrollViewerTo.current(hl)`

**Notas do PDF**:
- Arquivo `notes-<nome>.md` criado automaticamente no mesmo diretorio, com frontmatter `pdf: "[[path]]"` vinculando ao PDF
- Qualquer nota `.md` pode ser vinculada a um PDF adicionando `pdf: "[[path]]"` no frontmatter
- Auto-save com debounce de 1s via instancia independente de `createEditor`

**Estado no store** (`pdfHighlightTarget: string | null`):
- `store.setPdfHighlightTarget(id)` — define o highlight alvo
- `store.clearPdfHighlightTarget()` — limpa apos o scroll ser executado

**Traducao e exemplos** (`server/services/llm.ts` + `server/routes/translate.ts` + `src/core/services/translation.ts`):
- `LLMProvider` interface com `complete(prompt): Promise<string>` — permite adicionar novos provedores (ex: Ollama) sem mudar o resto
- `OpenRouterProvider` implementa a interface; modelo default `google/gemma-3n-e2b-it:free`; requer `OPEN_ROUTER_API_KEY` no `.env`
- `createLLMProvider()` factory — ponto unico para trocar de provedor no futuro
- `POST /api/translate` — traduz texto livre via LLM
- `POST /api/translate/examples` — pede 3 frases de exemplo em JSON; `extractJson()` lida com fences de markdown e texto extra ao redor do array
- Frontend: `translateText()` e `getExamples()` em `src/core/services/translation.ts`
- `TranslationDialog` (em `PdfHighlightMenu.tsx`): portal fixo que bloqueia `mousedown` e `click` no backdrop para impedir que o listener do `react-pdf-highlighter` (registrado no `document`) desmonte o tip e feche o dialog; fecha apenas pelo botao X ou "Fechar"
- Botao "Exemplos" no rodape do dialog — busca exemplos somente quando clicado (nao na abertura); exibe original + traducao em cards separados
- Tanto `ColorPicker` (selecao nova) quanto `HighlightActionMenu` (highlight existente) expoe o botao "Traduzir"

## Convencoes

- Arquivos `.md` e `.pdf` sao processados
- Arquivos ficam em `docs/`
- Tema dark com paleta Catppuccin Mocha
- Path aliases: `@/` mapeia para `src/`, `@core/` mapeia para `src/core/`
- Express 5: `req.params.splat` retorna array — sempre usar `.join("/")` para reconstruir paths
