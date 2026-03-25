# Study MD — AGENTS.md

Editor e leitor de notas markdown + PDF, estilo Obsidian, com dark mode e syntax highlighting em tempo real.

## Stack

- **Frontend**: React 19 + TypeScript + Vite 7 + Tailwind CSS v4 + CodeMirror 6
- **Backend**: NestJS + Node.js (via tsx)
- **Desktop**: Electron 41 via electron-vite
- **AI**: LangChain + Ollama (local) / OpenRouter / Google

## Comandos

Sempre rode `nvm use` antes de qualquer comando Node para garantir a versão correta.
Sempre use `pnpm` — nunca `npm`.

| Script | O que faz |
|--------|-----------|
| `pnpm dev:electron` | App desktop completo (Electron + Vite + NestJS) |
| `pnpm dev:client` | Apenas frontend Vite (sem backend) |
| `pnpm dev:server` | Apenas NestJS em watch mode |
| `pnpm build` | Build de produção do frontend |

O backend roda na porta **3000** com prefixo `/api`. O frontend Vite roda na porta **5173** por padrão.

## Path aliases (client)

| Alias | Resolve para |
|-------|-------------|
| `@app/` | `client/src/app/` |
| `@features/` | `client/src/features/` |
| `@shared/` | `client/src/shared/` |

## Variáveis de ambiente

O arquivo `.env` fica na **raiz do projeto** (`../.env` relativo ao diretório `server/`). O `ConfigModule` no NestJS usa `envFilePath: '../.env'`.

Variáveis usadas:
- `OPEN_ROUTER_API_KEY` — para provider OpenRouter
- `GOOGLE_API_KEY` — para provider Google
- Ollama não requer API key (roda localmente)

## Tokens de cor (Tailwind)

O projeto usa tokens semânticos próprios registrados no `@theme` do Tailwind (`client/src/index.css`). **Nunca use tokens shadcn/Tailwind padrão** como `bg-primary`, `text-primary`, `bg-muted`, `bg-background`, `text-foreground` — esses são apenas pontes internas.

| Classe Tailwind | Uso |
|-----------------|-----|
| `bg-bg` | Fundo principal |
| `bg-surface` | Superfície elevada (painéis, sidebars) |
| `bg-surface-2` | Superfície ainda mais elevada (inputs, hover) |
| `text-fg` | Texto primário |
| `text-fg-secondary` | Texto secundário |
| `text-fg-muted` | Texto esmaecido (placeholders) |
| `text-accent` / `bg-accent` | Cor de destaque |
| `bg-accent-dim` | Fundo sutil de accent (hover states) |
| `border-border` | Bordas padrão |
| `border-border-subtle` | Bordas discretas |

Os tokens mudam automaticamente com o tema (`data-theme="indigo"` ou `data-theme="amber"`) e modo (dark/light).

## Convenções

- Arquivos de notas ficam em `docs/` (`.md` e `.pdf`)
- Todos os Zustand stores usam o padrão `actions` (objeto estável dentro do `create()`, nunca recriado)
- NestJS: controllers usam `@Get`, `@Put`, `@Post`, `@Patch`, `@Delete`; serviços são `@Injectable()`
- Arquitetura feature-based com colocation: cada feature agrupa componentes, stores e testes no mesmo diretório

## Arquivos de contexto por área

- Frontend: `client/AGENTS.md`
- Backend: `server/AGENTS.md`
- Electron: `electron/AGENTS.md`
