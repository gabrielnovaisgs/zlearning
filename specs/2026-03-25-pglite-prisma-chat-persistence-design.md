# Chat Persistence com PGLite + Prisma — Design

**Data:** 2026-03-25
**Status:** Aprovado

## Contexto

Atualmente as sessões de chat são armazenadas como arquivos JSON em `docs/chat/history/`. As mensagens não são persistidas entre sessões — o `useChat` do AI SDK guarda tudo em state React, perdido ao fechar o app. O objetivo é migrar para um banco local SQLite (via PGLite) com Prisma como ORM, persistindo sessões e mensagens para que o histórico seja recarregado ao reabrir uma conversa.

## Decisões

- **Banco:** PGLite (`@electric-sql/pglite`) — PostgreSQL embarcado, arquivo em `docs/chat/chat.db`
- **ORM:** Prisma com driver adapter `@prisma/adapter-pg-lite`
- **Estratégia de persistência:** client-driven sync via `onFinish` do `useChat`
- **Dados legados:** descartados (começo do zero, sem migração dos JSONs)
- **contextSources:** ignorados nesta iteração

## Schema Prisma

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider = "postgresql"
  url      = "postgresql://localhost/zlearning"
}

model Session {
  id        String    @id
  title     String
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  messages  Message[]
}

model Message {
  id        String   @id
  sessionId String
  role      String
  content   String
  createdAt DateTime @default(now())
  session   Session  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
}
```

## Arquitetura — Backend (NestJS)

### Novo módulo: `DatabaseModule`

Localização: `server/database/`

Arquivos:
- `database.module.ts` — módulo global que provê `PrismaService`
- `prisma.service.ts` — instancia `PGlite('file:./docs/chat/chat.db')`, cria `PrismaPGlite` adapter, expõe `PrismaClient`; roda `$connect()` no `onModuleInit` e `$disconnect()` no `onModuleDestroy`

O módulo é declarado com `@Global()` e registrado em `AppModule`, tornando `PrismaService` disponível em qualquer módulo sem imports adicionais.

### Mudanças no `ChatModule`

`ChatService` é reescrito para usar `PrismaService` no lugar de `fs`:

| Método | Comportamento |
|--------|---------------|
| `listSessions()` | `prisma.session.findMany({ orderBy: { updatedAt: 'desc' } })` |
| `createSession()` | `prisma.session.create(...)` com `nanoid()` |
| `getSession(id)` | `prisma.session.findUniqueOrThrow({ include: { messages: true } })` |
| `deleteSession(id)` | `prisma.session.delete(...)` — cascade remove mensagens |
| `syncMessages(id, messages)` | Upsert de todas as mensagens + atualiza `title` (primeira mensagem do usuário, truncada) e `updatedAt` da sessão |
| `streamMessage(...)` | Sem alterações |

### Novo endpoint

```
PUT /api/chat/sessions/:id/messages
Body: { messages: UIMessage[] }
```

Chama `chatService.syncMessages`. Extrai o texto de cada message via `parts` (filtra `type === 'text'`). Retorna `204 No Content`.

### Tipos

Os tipos `Session`, `SessionSummary`, `ChatMessageRecord`, `ContextSources` do `chat.service.ts` do servidor são removidos — substituídos pelos tipos gerados pelo Prisma.

## Arquitetura — Frontend (React)

### `chat.service.ts`

Adiciona:
```typescript
syncMessages: (id: string, messages: UIMessage[]) =>
  request<void>(`/api/chat/sessions/${id}/messages`, {
    method: 'PUT',
    body: JSON.stringify({ messages }),
  }),
```

### `use-chat-sessions.ts`

Nova mutation exportada:
```typescript
export function useSyncMessages() {
  return useMutation({
    mutationFn: ({ id, messages }: { id: string; messages: UIMessage[] }) =>
      chatService.syncMessages(id, messages),
  });
}
```

### `ChatEditor.tsx`

Duas mudanças:

**1. Carregar histórico como `initialMessages`**
```typescript
const initialMessages = useMemo(() =>
  session?.messages.map(m => ({
    id: m.id,
    role: m.role as 'user' | 'assistant',
    parts: [{ type: 'text' as const, text: m.content }],
    metadata: {},
  })) ?? [],
[session?.messages]);

const { messages, sendMessage, ... } = useChat({ transport, initialMessages, onFinish });
```

**2. `onFinish` dispara sync**
```typescript
const { mutate: syncMessages } = useSyncMessages();

onFinish: () => {
  if (realSessionId) syncMessages({ id: realSessionId, messages });
  invalidateSessions();
}
```

## Pacotes a instalar

```bash
pnpm add @prisma/client @prisma/adapter-pg-lite
pnpm add -D prisma
```

(`@electric-sql/pglite` já está instalado)

## Arquivos afetados

### Novos
- `server/database/database.module.ts`
- `server/database/prisma.service.ts`
- `prisma/schema.prisma`

### Modificados
- `server/app.module.ts` — registrar `DatabaseModule`
- `server/chat/chat.service.ts` — reescrito sem `fs`, usa `PrismaService`
- `server/chat/chat.controller.ts` — adicionar endpoint `PUT .../messages`
- `server/chat/chat.module.ts` — remover `FilesystemModule` se não usado por mais ninguém
- `client/src/features/chat/chat.service.ts` — adicionar `syncMessages`
- `client/src/features/chat/use-chat-sessions.ts` — adicionar `useSyncMessages`
- `client/src/features/chat/ChatEditor.tsx` — `initialMessages` + `onFinish`

### Removidos
- `docs/chat/history/*.json` (arquivos legados, ignorados)

## Fluxo completo

```
Usuário abre sessão existente
→ GET /api/chat/sessions/:id (inclui messages)
→ initialMessages passado para useChat
→ histórico renderizado no ChatMessages

Usuário envia mensagem
→ POST /api/chat/sessions/:id/messages (stream, sem mudança)
→ streaming renderizado em tempo real

Stream termina (onFinish)
→ PUT /api/chat/sessions/:id/messages com messages completo
→ servidor faz upsert no banco, atualiza title e updatedAt
→ invalidateSessions() atualiza sidebar
```
