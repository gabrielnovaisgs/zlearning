# Interface

Definição visual da interface da aplicação. Base: **Option A — Soft Geometric**, tema **Indigo** como padrão.

Referência visual interativa: `pocs/interface/interface-mock.html`

---

## Layout

Estrutura fixa em 4 zonas horizontais, sem scroll na raiz:

```
┌─────────────────────────────────────────────────────┐
│ Activity Bar │ Sidebar │ Tab Bar                     │
│   (44px)     │ (220px) ├─────────────────────────────┤
│              │         │ Editor / Chat / PDF / NewTab │
│              │         │                             │
└─────────────────────────────────────────────────────┘
```

| Zona | Largura | Altura | Notas |
|------|---------|--------|-------|
| Activity Bar | 44px fixo | 100vh | Colapsável via botão |
| Sidebar | 220px padrão | 100vh | Offcanvas, redimensionável (180–500px) |
| Tab Bar | flex | 36px fixo | Por pane |
| Editor | flex | restante | Split horizontal em N panes |

---

## Border Radius — Soft Geometric

Raios moderados e consistentes. Sidebar items "flutuam" com margem lateral.

| Componente | Radius | Observação |
|------------|--------|------------|
| Activity bar buttons | `8px` | |
| Sidebar items | `6px` | + `margin: 1px 6px` para efeito floating |
| Sidebar action button | `6px` | |
| Tabs | `8px 8px 0 0` | Arredondado só no topo, conecta ao editor |
| Tab bar buttons | `6px` | |
| Command palette | `16px` | Componente premium, raio maior |
| Palette items | `8px` | |
| Palette item icon | `8px` | |
| New tab cards | `14px` | |
| New tab card icons | `10px` | |
| Tags / badges | `6px` | Retangular, não pill |
| Buttons primários | `8px` | |
| Code blocks | `8px` | |
| Chat input wrapper | `12px` | |
| Chat avatares | `8px` | |
| Chat send button | `8px` | |
| Chat message bubble (usuário) | `12px 4px 12px 12px` | Assimétrico |
| Demo / toggle controls | `8px` | |

---

## Ícones

Biblioteca: **Lucide** (`lucide-react` no app, `lucide` via CDN no mockup).

Propriedades padrão dos ícones na UI:

```
stroke-width: 1.75
size (sidebar): 14×14px
size (tabs): 13×13px
size (activity bar): 15×15px
size (palette): 14×14px
```

### Mapeamento por tipo de arquivo

| Tipo | Ícone Lucide | Cor | Notas |
|------|-------------|-----|-------|
| Markdown (`.md`) | `file-text` | `--fg-secondary` / `--accent` quando ativo | |
| PDF (`.pdf`) | `book-open` | `#E07B54` (laranja fixo, ambos os temas) | Cor distinta para diferenciar |
| Pasta fechada | `folder` | `--fg-muted` | |
| Pasta aberta | `folder-open` | `--accent` | Troca ao expandir |

### Ícones da UI

| Elemento | Ícone Lucide | Notas |
|----------|-------------|-------|
| Toggle sidebar | `panel-left-open` / `panel-left-close` | Alterna conforme estado |
| Busca global | `search` | Activity bar + command palette input |
| Chat / IA | `message-square` | Activity bar + tab |
| Configurações | `settings` (ou variante) | Activity bar bottom |
| Nova aba / novo arquivo | `plus` | Tab bar, sidebar header |
| Dividir painel | `columns` (rect + divider) | Tab bar action |
| Fechar tab/pane | `×` (texto) | Aparece no hover da tab |
| Chevron de pasta | `chevron-right` | Rotaciona 90° quando aberto |

### Cores dos ícones

| Estado | Cor |
|--------|-----|
| Inativo padrão | `--fg-muted` |
| Hover | `--fg` |
| Ativo / selecionado | `--accent` |
| PDF (sempre) | `#E07B54` |
| Pasta aberta | `--accent` |

---

## Componentes principais

### Activity Bar

- Fundo: `--surface`
- Borda direita: `1px solid --border`
- Ícone logo no topo (18×18px, cor `--accent`)
- Botões com tooltip `side="right"` ao hover
- Ações secundárias agrupadas no bottom via `margin-top: auto`

### Sidebar

- Fundo: `--surface`
- Header: 36px, label uppercase `11px` + botão `+`
- Items flutuantes: `border-radius: 6px`, `margin: 1px 6px`
- Item ativo: `background: --accent-dim` + borda esquerda `2px solid --accent` (`border-radius: 0 2px 2px 0`, inset)
- Pasta aberta: ícone `folder-open` na cor `--accent`
- Indentação de subpastas: `padding-left: 36px`

### Tab Bar

- Fundo: `--surface`
- Borda inferior: `1px solid --border`
- Tab ativa: `background: --tab-active-bg` + linha inferior `1.5px solid --accent`
- Tab inativa: `color: --fg-muted`, hover `--surface-2`
- Ícone de tipo de arquivo à esquerda do label

### Command Palette

- Overlay: `backdrop-filter: blur(4px)` + `rgba(0,0,0,0.35)`
- Container: `backdrop-filter: blur(20px) saturate(180%)`, `background: --glass`
- Input: 46px de altura, `caret-color: --accent`
- Items: hover/selected em `--accent-hover`
- Match highlight: `color: --accent`, `font-weight: 500`

### Editor

- Fundo: `--bg` (mais escuro que sidebar/tabbar)
- Título: **Instrument Serif** 32px, editável ao clicar
- Meta row: data + tags abaixo do título, separados por `border-bottom`
- Conteúdo: max-width `720px`, centralizado, `padding: 40px 56px`
- Sem borda ou chrome ao redor — editor some, conteúdo aparece

### Chat

- Avatares IA: `background: --accent-dim`, `border: 1px solid --border`
- Avatares usuário: `background: --surface-2`
- Bubble usuário: `background: --surface`, `border: 1px solid --border`
- Input: `border-radius: 12px`, borda `--border`, foco suavizado
- Context bar: tags pill accent + botão "Adicionar nota"
- Send button: `background: --accent`, ícone `send` branco

---

## Transições

Todas as propriedades visuais transitam suavemente na troca de tema:

```css
transition: background-color 0.18s ease,
            border-color     0.18s ease,
            color            0.18s ease,
            box-shadow       0.18s ease;
```

Componentes interativos (tabs, items, botões) usam `0.12s` para resposta mais rápida.
