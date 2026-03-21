# Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar o frontend do tema Catppuccin Mocha hardcoded para o design system Indigo/Amber com suporte a light/dark mode, novos tokens CSS, ícones Lucide e bordas Soft Geometric.

**Architecture:** Substituição incremental dos tokens CSS existentes (`--color-bg-*`, `--color-text-*`) pelos novos tokens semânticos (`--bg`, `--surface`, `--fg`, `--accent`), com suporte a 4 combinações de tema via `data-theme` + classe `dark` no `<html>`. Uma Zustand store gerencia a preferência persistida em `localStorage`. Nenhuma estrutura de componente é reescrita — apenas classes Tailwind e valores CSS são atualizados.

**Tech Stack:** React 19, TypeScript, Tailwind v4 (`@tailwindcss/vite`), Zustand, Lucide React, shadcn/ui (Radix UI + CVA), CodeMirror 6

**Design system reference:**
- `pocs/design-system/color-palettes.md` — todos os tokens hex por tema/modo
- `pocs/design-system/interface.md` — border radius, ícones, specs de componentes
- `pocs/interface/interface-mock.html` — referência visual interativa

---

## Mapa de arquivos

### Criados
| Arquivo | Responsabilidade |
|---------|-----------------|
| `client/src/features/theme/theme.store.ts` | Zustand store: tema (`indigo`\|`amber`), modo (`dark`\|`light`), persistência localStorage, efeito no `<html>` |

### Modificados
| Arquivo | O que muda |
|---------|-----------|
| `client/src/index.css` | Renomear todos os tokens, adicionar 4 blocos de tema, novo `@theme`, novo `--radius: 0.375rem` |
| `client/src/app/App.tsx` | Inicializar theme store, atualizar classe raiz |
| `client/src/features/activity-bar/ActivityBar.tsx` | Novas classes Tailwind, botão de toggle de tema/modo |
| `client/src/features/file-explorer/FileExplorer.tsx` | Novas classes Tailwind |
| `client/src/features/file-explorer/FileTree.tsx` | Novas classes Tailwind |
| `client/src/features/file-explorer/FileTreeItem.tsx` | Novas classes + ícones Lucide (`FileText`, `BookOpen`, `Folder`, `FolderOpen`) |
| `client/src/features/panes/TabBar.tsx` | Novas classes + ícones Lucide, indicador de aba ativo |
| `client/src/features/panes/PaneView.tsx` | Novas classes |
| `client/src/features/panes/SplitView.tsx` | Novas classes |
| `client/src/features/panes/NewTabScreen.tsx` | Novas classes |
| `client/src/features/markdown-editor/theme.ts` | Substituir hex hardcoded por `getComputedStyle` CSS vars |
| `client/src/shared/ui/button.tsx` | Radius `rounded-lg` (8px), variantes com novas cores |
| `client/src/shared/ui/input.tsx` | Radius `rounded-lg`, border/bg com novos tokens |
| `client/src/features/command-palette/OpenFilePalette.tsx` | Novas classes, ícones por tipo de arquivo |

---

## Mapa de tokens (old → new)

| Tailwind atual | Novo token CSS | Tailwind novo |
|----------------|---------------|---------------|
| `bg-bg-primary` | `--bg` | `bg-bg` |
| `bg-bg-secondary` | `--surface` | `bg-surface` |
| `bg-bg-surface` | `--surface-2` | `bg-surface-2` |
| `bg-bg-hover` | `--surface-2` | `bg-surface-2` |
| `text-text-primary` | `--fg` | `text-fg` |
| `text-text-secondary` | `--fg-secondary` | `text-fg-secondary` |
| `text-text-muted` | `--fg-muted` | `text-fg-muted` |
| `text-accent` / `bg-accent` | `--accent` | `text-accent` / `bg-accent` (sem mudança) |
| `border-border` | `--border` | `border-border` (sem mudança) |

---

## Estágios de execução

```
Estágio 1 (sequencial)
  └── Task 1: CSS Foundation (index.css)

Estágio 2 (paralelo — após Task 1)
  ├── Task 2: Theme Store + App.tsx
  ├── Task 3: Sidebar Zone (ActivityBar, FileExplorer, FileTree, FileTreeItem + ícones)
  ├── Task 4: Panes Zone (TabBar, PaneView, SplitView, NewTabScreen)
  └── Task 5: Shared UI + CodeMirror theme

Estágio 3 (sequencial — após Estágio 2)
  └── Task 6: Theme toggle UI (botão no ActivityBar)
```

---

## Task 1: CSS Foundation

**Pré-requisito:** nenhum. Deve ser executada primeiro.

**Files:**
- Modify: `client/src/index.css`

Esta task é a mais crítica — após ela, a app ficará "quebrada" visualmente até as Tasks 2–5 serem concluídas (tokens renomeados mas componentes ainda usando nomes antigos). Fazer em branch separado ou em sequência rápida com as demais tasks.

- [ ] **1.1** Substituir o bloco `@theme` existente pelo novo, mapeando os novos tokens:

```css
@theme {
  /* Bg */
  --color-bg:          var(--bg);
  --color-surface:     var(--surface);
  --color-surface-2:   var(--surface-2);
  /* Text */
  --color-fg:          var(--fg);
  --color-fg-secondary:var(--fg-secondary);
  --color-fg-muted:    var(--fg-muted);
  /* Accent */
  --color-accent:      var(--accent);
  --color-accent-dim:  var(--accent-dim);
  /* Border */
  --color-border:      var(--border);
  --color-border-subtle: var(--border-subtle);
}
```

> **Nota Tailwind v4:** `@theme` mapeia `--color-*` para utilities `bg-*`, `text-*`, `border-*`. Logo `--color-bg` → `bg-bg`, `--color-fg` → `text-fg`, etc.

- [ ] **1.2** Adicionar os 4 blocos de tema abaixo do `@theme` (antes do `@layer base`):

```css
/* ── Indigo Dark (padrão) ──────────────────── */
:root,
:root[data-theme="indigo"].dark {
  --bg:            #0C0C0F;
  --surface:       #131318;
  --surface-2:     #1A1A22;
  --border:        #24242E;
  --border-subtle: #1E1E28;
  --fg:            #E2E2F0;
  --fg-secondary:  #AAAAB8;
  --fg-muted:      #52526A;
  --accent:        #7B93F5;
  --accent-dim:    rgba(123,147,245,0.10);
  --accent-hover:  rgba(123,147,245,0.06);
  --glass:         rgba(19,19,24,0.82);
  --tab-active-bg: #0C0C0F;
}

/* ── Indigo Light ──────────────────────────── */
:root[data-theme="indigo"]:not(.dark) {
  --bg:            #F5F5F7;
  --surface:       #FFFFFF;
  --surface-2:     #EBEBED;
  --border:        #DDDDE0;
  --border-subtle: #E8E8EB;
  --fg:            #111118;
  --fg-secondary:  #3C3C4A;
  --fg-muted:      #8E8EA0;
  --accent:        #4F6AF0;
  --accent-dim:    rgba(79,106,240,0.10);
  --accent-hover:  rgba(79,106,240,0.06);
  --glass:         rgba(255,255,255,0.75);
  --tab-active-bg: #FFFFFF;
}

/* ── Amber Dark ────────────────────────────── */
:root[data-theme="amber"].dark {
  --bg:            #0D0C0A;
  --surface:       #141310;
  --surface-2:     #1A1916;
  --border:        #252219;
  --border-subtle: #1F1D18;
  --fg:            #E8E2D6;
  --fg-secondary:  #B5AFA4;
  --fg-muted:      #5C5650;
  --accent:        #D4A853;
  --accent-dim:    rgba(212,168,83,0.10);
  --accent-hover:  rgba(212,168,83,0.06);
  --glass:         rgba(20,19,16,0.80);
  --tab-active-bg: #0D0C0A;
}

/* ── Amber Light ───────────────────────────── */
:root[data-theme="amber"]:not(.dark) {
  --bg:            #F7F6F3;
  --surface:       #FFFFFF;
  --surface-2:     #F0EDE8;
  --border:        #E4E0D8;
  --border-subtle: #EDE9E2;
  --fg:            #1C1916;
  --fg-secondary:  #4A4640;
  --fg-muted:      #9A9289;
  --accent:        #C9963A;
  --accent-dim:    rgba(201,150,58,0.12);
  --accent-hover:  rgba(201,150,58,0.08);
  --glass:         rgba(255,255,255,0.70);
  --tab-active-bg: #FFFFFF;
}
```

- [ ] **1.3** Atualizar `--radius` no `@layer base` para `0.375rem` (6px):

```css
--radius: 0.375rem;
```

- [ ] **1.4** Remover o bloco `@theme` antigo com `--color-bg-primary`, `--color-text-primary`, etc. (agora substituído)

- [ ] **1.5** Atualizar `@layer base` para usar novos tokens:

```css
@layer base {
  * { @apply border-border; }
  body { @apply bg-bg text-fg; }
}
```

- [ ] **1.6** Adicionar transição global de tema:

```css
@layer base {
  *, *::before, *::after {
    transition:
      background-color 0.18s ease,
      border-color     0.18s ease,
      color            0.18s ease;
  }
}
```

- [ ] **1.7** Commit:

```bash
git add client/src/index.css
git commit -m "feat(theme): replace CSS tokens with design system variables (4 themes)"
```

---

## Task 2: Theme Store + App.tsx

**Pode rodar em paralelo com Tasks 3, 4 e 5 após Task 1.**

**Files:**
- Create: `client/src/features/theme/theme.store.ts`
- Modify: `client/src/app/App.tsx`

- [ ] **2.1** Criar `client/src/features/theme/theme.store.ts`:

```ts
import { create } from 'zustand'

type ThemeMode = 'dark' | 'light'
type ThemeName = 'indigo' | 'amber'

interface ThemeState {
  mode: ThemeMode
  theme: ThemeName
  actions: {
    setMode: (mode: ThemeMode) => void
    setTheme: (theme: ThemeName) => void
    toggleMode: () => void
  }
}

function applyTheme(theme: ThemeName, mode: ThemeMode) {
  const html = document.documentElement
  html.setAttribute('data-theme', theme)
  html.classList.toggle('dark', mode === 'dark')
  localStorage.setItem('theme', theme)
  localStorage.setItem('mode', mode)
}

const savedTheme = (localStorage.getItem('theme') as ThemeName) ?? 'indigo'
const savedMode  = (localStorage.getItem('mode')  as ThemeMode) ?? 'dark'

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode:  savedMode,
  theme: savedTheme,
  actions: {
    setMode: (mode) => {
      set({ mode })
      applyTheme(get().theme, mode)
    },
    setTheme: (theme) => {
      set({ theme })
      applyTheme(theme, get().mode)
    },
    toggleMode: () => {
      const next = get().mode === 'dark' ? 'light' : 'dark'
      get().actions.setMode(next)
    },
  },
}))

// Apply on module load (before React renders)
applyTheme(savedTheme, savedMode)
```

- [ ] **2.2** Em `client/src/app/App.tsx`, importar o store para garantir que o módulo seja carregado e o `applyTheme` execute antes do primeiro render. Não é necessário usar o hook — apenas importar o módulo é suficiente:

```ts
import '@features/theme/theme.store'
```

- [ ] **2.3** Atualizar a classe raiz do `<SidebarProvider>` em `App.tsx`:

```tsx
// antes
className="h-screen overflow-hidden bg-bg-primary text-text-primary"

// depois
className="h-screen overflow-hidden bg-bg text-fg"
```

- [ ] **2.4** Commit:

```bash
git add client/src/features/theme/theme.store.ts client/src/app/App.tsx
git commit -m "feat(theme): add theme store with indigo/amber + dark/light persistence"
```

---

## Task 3: Sidebar Zone

**Paralela com Tasks 2, 4 e 5. Depende apenas da Task 1.**

**Files:**
- Modify: `client/src/features/activity-bar/ActivityBar.tsx`
- Modify: `client/src/features/file-explorer/FileExplorer.tsx`
- Modify: `client/src/features/file-explorer/FileTree.tsx`
- Modify: `client/src/features/file-explorer/FileTreeItem.tsx`

### ActivityBar

- [ ] **3.1** Em `ActivityBar.tsx`, substituir classes antigas pelo novo padrão:

```tsx
// Container
// antes: bg-bg-secondary border-border
// depois:
className="flex h-full w-11 shrink-0 flex-col items-center border-r border-border bg-surface py-2 gap-0.5"

// Botões inativos
// antes: text-text-muted hover:bg-bg-hover hover:text-text-primary
// depois:
className="... text-fg-muted hover:bg-surface-2 hover:text-fg rounded-lg"

// Botão ativo
// antes: text-text-primary
// depois:
className="... text-fg bg-accent/10 rounded-lg"
```

### FileExplorer

- [ ] **3.2** Em `FileExplorer.tsx`, atualizar header:

```tsx
// SidebarHeader
// antes: bg-bg-secondary border-b border-border
// depois:
<SidebarHeader className="h-9 flex items-center justify-between px-3 border-b border-border/60 bg-surface">
  <span className="text-[11px] font-semibold uppercase tracking-widest text-fg-muted">
    {GLOBAL_CONFIG.appName}
  </span>
  ...
</SidebarHeader>
```

### FileTree

- [ ] **3.3** Em `FileTree.tsx`, atualizar área de drop raiz:

```tsx
// antes: bg-accent/10
// depois:
dragOver ? 'bg-accent/10 rounded-md' : ''
```

### FileTreeItem

Esta é a maior mudança do estágio: novas classes + ícones Lucide.

- [ ] **3.4** Adicionar imports dos ícones Lucide no topo do arquivo:

```tsx
import { FileText, BookOpen, Folder, FolderOpen, ChevronRight } from 'lucide-react'
```

- [ ] **3.5** Criar helper `FileIcon` local no arquivo:

```tsx
function FileIcon({ path, isOpen }: { path: string; isOpen?: boolean }) {
  if (!path) return null
  if (path.endsWith('.pdf')) {
    return <BookOpen size={14} strokeWidth={1.75} className="shrink-0 text-[#E07B54]" />
  }
  // directory
  if (isOpen !== undefined) {
    return isOpen
      ? <FolderOpen size={14} strokeWidth={1.75} className="shrink-0 text-accent" />
      : <Folder     size={14} strokeWidth={1.75} className="shrink-0 text-fg-muted" />
  }
  return <FileText size={14} strokeWidth={1.75} className="shrink-0 text-fg-secondary" />
}
```

- [ ] **3.6** Substituir o ícone inline nos itens de arquivo por `<FileIcon>`:

```tsx
// antes: <span className="text-xs">📄</span>  ou  emoji equivalente
// depois:
<FileIcon path={entry.path} />
```

- [ ] **3.7** Substituir o ícone de pasta pelo `ChevronRight` + `FileIcon` com `isOpen`:

```tsx
// antes: <ChevronRight ... className={isExpanded ? 'rotate-90' : ''} />  + emoji de pasta
// depois:
<ChevronRight
  size={12}
  strokeWidth={2.5}
  className={`shrink-0 text-fg-muted transition-transform ${isExpanded ? 'rotate-90' : ''}`}
/>
<FileIcon path={entry.path} isOpen={isExpanded} />
```

- [ ] **3.8** Atualizar as classes do item de arquivo (floating effect):

```tsx
// Item wrapper
// antes: rounded px-2 py-1
// depois (floating com margem lateral):
className={`
  flex w-full items-center gap-1.5 rounded-md mx-1.5 px-2 py-1 text-left text-sm
  transition-colors cursor-pointer select-none
  ${isActive
    ? 'bg-accent/10 text-fg border-l-2 border-accent pl-[6px]'
    : 'text-fg-secondary hover:bg-surface-2 hover:text-fg border-l-2 border-transparent pl-[6px]'
  }
`}
```

- [ ] **3.9** Atualizar label das seções de pasta:

```tsx
// texto da seção/pasta: text-text-muted → text-fg-muted
className="text-[11px] font-medium text-fg-muted ..."
```

- [ ] **3.10** Commit:

```bash
git add client/src/features/activity-bar/ client/src/features/file-explorer/
git commit -m "feat(ui): update sidebar zone with new tokens and Lucide icons"
```

---

## Task 4: Panes Zone

**Paralela com Tasks 2, 3 e 5. Depende apenas da Task 1.**

**Files:**
- Modify: `client/src/features/panes/TabBar.tsx`
- Modify: `client/src/features/panes/PaneView.tsx`
- Modify: `client/src/features/panes/SplitView.tsx`
- Modify: `client/src/features/panes/NewTabScreen.tsx`

### TabBar

- [ ] **4.1** Atualizar container do TabBar:

```tsx
// antes: bg-bg-secondary border-b border-border
// depois:
className="flex items-center bg-surface border-b border-border overflow-x-auto shrink-0"
style={{ height: GLOBAL_CONFIG.headerHeight }}
```

- [ ] **4.2** Adicionar imports de ícones para as tabs:

```tsx
import { FileText, BookOpen, MessageSquare, Plus, Columns2, X } from 'lucide-react'
```

- [ ] **4.3** Criar helper `TabIcon` no arquivo:

```tsx
function TabIcon({ path }: { path: string | null }) {
  if (!path) return <Plus size={12} strokeWidth={2} className="text-fg-muted" />
  if (path.endsWith('.pdf'))  return <BookOpen     size={13} strokeWidth={1.75} className="text-[#E07B54]" />
  if (path.endsWith('.chat')) return <MessageSquare size={13} strokeWidth={1.75} className="text-fg-secondary" />
  return <FileText size={13} strokeWidth={1.75} className="text-fg-secondary" />
}
```

- [ ] **4.4** Atualizar classes das tabs individuais (adicionar `rounded-t-lg` + indicador de aba):

```tsx
// Tab wrapper
className={`
  relative flex items-center gap-1.5 px-3 py-1 text-sm cursor-pointer select-none
  border-r border-border/60 shrink-0 transition-colors
  ${isActive
    ? 'bg-[var(--tab-active-bg)] text-fg after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[1.5px] after:bg-accent rounded-t-lg'
    : 'text-fg-muted hover:text-fg-secondary hover:bg-surface-2'
  }
`}
```

- [ ] **4.5** Substituir ícones de tab pelo `<TabIcon path={tab.path} />`.

- [ ] **4.6** Atualizar botões de ação da TabBar:

```tsx
// botão split, nova tab, fechar pane
className="... text-fg-muted hover:text-fg hover:bg-surface-2 rounded-md"
```

### PaneView + SplitView

- [ ] **4.7** Em `PaneView.tsx`, atualizar drop overlay e container:

```tsx
// container
className="relative flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden bg-bg"

// drop overlay
className="absolute inset-y-0 z-40 pointer-events-none bg-accent/15 border-2 border-accent ..."
```

- [ ] **4.8** Em `SplitView.tsx`, atualizar resize handle:

```tsx
className="w-px bg-border hover:bg-accent shrink-0 cursor-col-resize z-10 transition-colors hover:w-0.5"
```

### NewTabScreen

- [ ] **4.9** Em `NewTabScreen.tsx`, atualizar cards e container:

```tsx
// container
className="flex flex-1 items-center justify-center bg-bg"

// cards
className="
  flex flex-col items-center gap-3 px-8 py-6 w-44 rounded-xl cursor-pointer
  border border-border bg-surface transition-all
  hover:border-accent/50 hover:bg-surface-2 hover:-translate-y-px
  group
"

// label
className="text-sm font-medium text-fg-secondary group-hover:text-accent"

// hint
className="text-xs font-mono text-fg-muted"
```

- [ ] **4.10** Commit:

```bash
git add client/src/features/panes/
git commit -m "feat(ui): update panes zone with new tokens, tab icons and radius"
```

---

## Task 5: Shared UI + CodeMirror

**Paralela com Tasks 2, 3 e 4. Depende apenas da Task 1.**

**Files:**
- Modify: `client/src/shared/ui/button.tsx`
- Modify: `client/src/shared/ui/input.tsx`
- Modify: `client/src/features/markdown-editor/theme.ts`
- Modify: `client/src/features/command-palette/OpenFilePalette.tsx`

### button.tsx

- [ ] **5.1** Atualizar `cva` do Button para usar novos tokens e `rounded-lg` (8px):

```tsx
// base
"inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors
 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:opacity-50"

// variant default
"bg-accent text-white hover:bg-accent/90"

// variant ghost
"hover:bg-surface-2 hover:text-fg text-fg-muted"

// variant outline
"border border-border bg-transparent hover:bg-surface-2 text-fg"
```

### input.tsx

- [ ] **5.2** Atualizar `Input`:

```tsx
className="flex h-9 w-full rounded-lg border border-border bg-surface-2 px-3 py-1
           text-sm text-fg placeholder:text-fg-muted
           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50
           disabled:opacity-50"
```

### CodeMirror theme.ts

- [ ] **5.3** Em `theme.ts`, substituir as cores hardcoded do `EditorView.theme` por leitura de CSS vars via `getComputedStyle`. Criar helper no topo do arquivo:

```ts
function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}
```

- [ ] **5.4** Criar função `buildEditorTheme()` que lê as CSS vars e retorna o tema CodeMirror. Substituir o tema exportado por uma chamada a essa função:

```ts
export function buildEditorTheme() {
  return EditorView.theme({
    '&': {
      backgroundColor: cssVar('--bg'),
      color: cssVar('--fg-secondary'),
    },
    '.cm-content': {
      caretColor: cssVar('--accent'),
      fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
      fontSize: '15px',
      padding: '8px 48px 24px',
      maxWidth: '800px',
    },
    '.cm-cursor': { borderLeftColor: cssVar('--accent'), borderLeftWidth: '2px' },
    '.cm-selectionBackground, ::selection': { backgroundColor: cssVar('--surface-2') },
    '.cm-activeLineBackground': { backgroundColor: `${cssVar('--surface-2')}66` },
    // Manter syntax highlighting existente (cores Catppuccin são adequadas para ambos os temas)
    // Apenas fundo e texto principal são dinâmicos
  }, { dark: true })
}
```

- [ ] **5.5** Em `MarkdownEditor.tsx` (ou onde o tema é aplicado), chamar `buildEditorTheme()` ao invés de importar o tema estático. Reconstruir o tema quando o modo mudar — usar `useThemeStore` para reagir a mudanças.

### OpenFilePalette

- [ ] **5.6** Em `OpenFilePalette.tsx`, substituir classes antigas pelos novos tokens e adicionar ícones por tipo:

```tsx
// Container do dialog/command
className="... bg-glass backdrop-blur-xl border border-border rounded-2xl shadow-xl"

// Input
className="... bg-transparent text-fg placeholder:text-fg-muted caret-accent"

// Itens
className="... rounded-lg hover:bg-accent/10 text-fg-secondary"
```

- [ ] **5.7** Adicionar ícones de tipo no item da palette (reutilizar o mesmo padrão de `FileTreeItem`):

```tsx
import { FileText, BookOpen } from 'lucide-react'

// no render de cada item:
{path.endsWith('.pdf')
  ? <BookOpen size={14} className="text-[#E07B54]" />
  : <FileText size={14} className="text-fg-secondary" />
}
```

- [ ] **5.8** Commit:

```bash
git add client/src/shared/ui/ client/src/features/markdown-editor/theme.ts client/src/features/command-palette/
git commit -m "feat(ui): update shared components, CodeMirror theme and palette with new design tokens"
```

---

## Task 6: Theme Toggle UI

**Sequencial — após todas as Tasks do Estágio 2.**

**Files:**
- Modify: `client/src/features/activity-bar/ActivityBar.tsx`

- [ ] **6.1** Importar `useThemeStore` e adicionar botão de toggle de modo (dark/light) no bottom do ActivityBar:

```tsx
import { useThemeStore } from '@features/theme/theme.store'
import { Sun, Moon } from 'lucide-react'

// dentro do componente:
const { mode, actions } = useThemeStore(s => ({ mode: s.mode, actions: s.actions }))

// no JSX, no grupo de botões do bottom:
<Tooltip>
  <TooltipTrigger asChild>
    <button
      onClick={actions.toggleMode}
      className="w-8 h-8 flex items-center justify-center rounded-lg text-fg-muted hover:bg-surface-2 hover:text-fg transition-colors"
    >
      {mode === 'dark' ? <Sun size={15} strokeWidth={1.75} /> : <Moon size={15} strokeWidth={1.75} />}
    </button>
  </TooltipTrigger>
  <TooltipContent side="right">
    {mode === 'dark' ? 'Modo claro' : 'Modo escuro'}
  </TooltipContent>
</Tooltip>
```

- [ ] **6.2** (Opcional para futuro) Botão de troca de tema (indigo/amber) — pode ficar em Settings. Por hora, omitir do ActivityBar para não poluir a UI. A troca pode ser feita via `useThemeStore.getState().actions.setTheme('amber')` no console para testar.

- [ ] **6.3** Commit:

```bash
git add client/src/features/activity-bar/ActivityBar.tsx
git commit -m "feat(theme): add dark/light mode toggle button to activity bar"
```

---

## Verificação final

- [ ] App abre sem erros no console
- [ ] Dark mode indigo (padrão): visual idêntico ao `pocs/interface/interface-mock.html`
- [ ] Clique no toggle de modo → transição suave para light mode
- [ ] Recarregar página → preferência persiste (localStorage)
- [ ] Ícones Lucide visíveis para `.md` (FileText), `.pdf` (BookOpen), pastas (Folder/FolderOpen)
- [ ] Pastas fechadas/abertas trocam o ícone corretamente
- [ ] Command palette abre com glassmorphism correto
- [ ] Editor markdown não quebra (CodeMirror carrega com novos tokens)
- [ ] Tema amber acessível via `useThemeStore.getState().actions.setTheme('amber')` no console

---

## Notas de implementação

**Tailwind v4 e CSS vars customizadas:** No Tailwind v4, `@theme { --color-X: ... }` cria as utilities `bg-X`, `text-X`, `border-X`. As CSS vars de tema (`--bg`, `--surface`, etc.) NÃO são definidas no `@theme` — elas ficam nos seletores `:root[data-theme="..."]`. O `@theme` mapeia `--color-bg: var(--bg)` para que o Tailwind gere `bg-bg` como `background-color: var(--bg)`.

**CodeMirror e tema dinâmico:** O tema CodeMirror é construído uma vez no setup. Para reagir à mudança de modo, o `MarkdownEditor` deve re-criar o editor ou usar `Compartment` para trocar o tema em tempo real. A abordagem mais simples é usar `Compartment` para o tema e re-despachar quando `mode` mudar.

**Shadcn sidebar.tsx:** O componente `sidebar.tsx` em `shared/ui/` usa variáveis `--sidebar-*` que ainda existem no CSS. Manter essas variáveis apontando para os novos tokens para não quebrar o Radix Sidebar.
