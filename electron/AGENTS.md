# Electron — AGENTS.md

Contexto específico do processo Electron. Leia também o `AGENTS.md` da raiz.

## Scripts

| Script | Uso |
|--------|-----|
| `pnpm dev:electron` | Inicia app completo com electron-vite (recomendado para dev desktop) |
| `pnpm dev:client` | Apenas Vite, sem Electron/backend (para dev de UI isolada) |

## Processo principal (electron/main/index.ts)

- Em desenvolvimento, a URL do renderer é lida de `process.env['ELECTRON_RENDERER_URL']` — injetada automaticamente pelo electron-vite
- Em produção, carrega `../renderer/index.html` relativo ao bundle do main process
- O preload script fica em `../preload/index.mjs`
- Flag `disable-features=VaasiVideoDecoder,VaasiVideoEncoder` é aplicada via command-line switch (compatibilidade Linux)
