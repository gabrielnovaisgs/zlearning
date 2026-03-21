# Color Palettes

Dois temas oficiais da aplicação. O tema **Indigo** é o padrão e foco principal de desenvolvimento. O tema **Amber** é alternativo, disponível para troca pelo usuário.

---

## Indigo (padrão)

Tom frio, preciso, digital. Inspirado em Linear e Raycast. Bom para pesquisa, código e sessões técnicas.

### Dark

| Token          | Hex       | Uso                                      |
| -------------- | --------- | ---------------------------------------- |
| `--bg`         | `#0C0C0F` | Fundo principal (editor, áreas vazias)   |
| `--surface`    | `#131318` | Activity bar, sidebar, tab bar           |
| `--surface-2`  | `#1A1A22` | Hover states, inputs, code blocks        |
| `--border`     | `#24242E` | Bordas padrão                            |
| `--border-subtle` | `#1E1E28` | Separadores sutis entre componentes   |
| `--fg`         | `#E2E2F0` | Texto primário                           |
| `--fg-secondary` | `#AAAAB8` | Texto secundário, conteúdo do editor   |
| `--fg-muted`   | `#52526A` | Placeholders, labels, ícones inativos    |
| `--accent`     | `#7B93F5` | Aba ativa, links, botões, destaques      |
| `--accent-dim` | `rgba(123,147,245,0.10)` | Background de itens ativos  |
| `--accent-hover` | `rgba(123,147,245,0.06)` | Hover em itens da palette  |
| `--glass`      | `rgba(19,19,24,0.82)` | Command palette (backdrop-blur)    |
| `--tab-active-bg` | `#0C0C0F` | Background da aba ativa (= `--bg`)   |

### Light

| Token          | Hex       | Uso                                      |
| -------------- | --------- | ---------------------------------------- |
| `--bg`         | `#F5F5F7` | Fundo principal                          |
| `--surface`    | `#FFFFFF` | Activity bar, sidebar, tab bar           |
| `--surface-2`  | `#EBEBED` | Hover states, inputs, code blocks        |
| `--border`     | `#DDDDE0` | Bordas padrão                            |
| `--border-subtle` | `#E8E8EB` | Separadores sutis                     |
| `--fg`         | `#111118` | Texto primário                           |
| `--fg-secondary` | `#3C3C4A` | Texto secundário                       |
| `--fg-muted`   | `#8E8EA0` | Placeholders, labels, ícones inativos    |
| `--accent`     | `#4F6AF0` | Aba ativa, links, botões, destaques      |
| `--accent-dim` | `rgba(79,106,240,0.10)` | Background de itens ativos   |
| `--accent-hover` | `rgba(79,106,240,0.06)` | Hover em itens da palette   |
| `--glass`      | `rgba(255,255,255,0.75)` | Command palette (backdrop-blur)   |
| `--tab-active-bg` | `#FFFFFF` | Background da aba ativa (= `--surface`) |

---

## Amber (alternativo)

Tom quente, acadêmico, evoca papel e anotações físicas. Inspirado em Craft e iA Writer. Bom para leitura e escrita de longo prazo.

### Dark

| Token          | Hex       | Uso                                      |
| -------------- | --------- | ---------------------------------------- |
| `--bg`         | `#0D0C0A` | Fundo principal                          |
| `--surface`    | `#141310` | Activity bar, sidebar, tab bar           |
| `--surface-2`  | `#1A1916` | Hover states, inputs, code blocks        |
| `--border`     | `#252219` | Bordas padrão                            |
| `--border-subtle` | `#1F1D18` | Separadores sutis                     |
| `--fg`         | `#E8E2D6` | Texto primário (levemente quente)        |
| `--fg-secondary` | `#B5AFA4` | Texto secundário                       |
| `--fg-muted`   | `#5C5650` | Placeholders, labels, ícones inativos    |
| `--accent`     | `#D4A853` | Aba ativa, links, botões, destaques      |
| `--accent-dim` | `rgba(212,168,83,0.10)` | Background de itens ativos  |
| `--accent-hover` | `rgba(212,168,83,0.06)` | Hover em itens da palette  |
| `--glass`      | `rgba(20,19,16,0.80)` | Command palette (backdrop-blur)    |
| `--tab-active-bg` | `#0D0C0A` | Background da aba ativa (= `--bg`)   |

### Light

| Token          | Hex       | Uso                                      |
| -------------- | --------- | ---------------------------------------- |
| `--bg`         | `#F7F6F3` | Fundo principal (branco levemente quente)|
| `--surface`    | `#FFFFFF` | Activity bar, sidebar, tab bar           |
| `--surface-2`  | `#F0EDE8` | Hover states, inputs, code blocks        |
| `--border`     | `#E4E0D8` | Bordas padrão                            |
| `--border-subtle` | `#EDE9E2` | Separadores sutis                     |
| `--fg`         | `#1C1916` | Texto primário (levemente quente)        |
| `--fg-secondary` | `#4A4640` | Texto secundário                       |
| `--fg-muted`   | `#9A9289` | Placeholders, labels, ícones inativos    |
| `--accent`     | `#C9963A` | Aba ativa, links, botões, destaques      |
| `--accent-dim` | `rgba(201,150,58,0.12)` | Background de itens ativos  |
| `--accent-hover` | `rgba(201,150,58,0.08)` | Hover em itens da palette  |
| `--glass`      | `rgba(255,255,255,0.70)` | Command palette (backdrop-blur)   |
| `--tab-active-bg` | `#FFFFFF` | Background da aba ativa (= `--surface`) |

---

## Implementação

Os tokens devem ser definidos como CSS custom properties no seletor `:root` (light) e `.dark` (dark mode), seguindo o padrão já usado no mockup. A troca de tema pelo usuário alterna a classe `dark` no `<html>` e o token de tema ativo (`data-theme="indigo"` ou `data-theme="amber"`).

```css
/* Exemplo de estrutura */
:root[data-theme="indigo"]       { /* indigo light */ }
:root[data-theme="indigo"].dark  { /* indigo dark  */ }
:root[data-theme="amber"]        { /* amber light  */ }
:root[data-theme="amber"].dark   { /* amber dark   */ }
```

A preferência do usuário deve ser persistida em `localStorage` com as chaves `theme` (`indigo` | `amber`) e `mode` (`dark` | `light`).
