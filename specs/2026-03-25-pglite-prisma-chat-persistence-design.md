# Chat Persistence com PGLite + Prisma — Design

**Data:** 2026-03-25
**Status:** Aprovado

## Contexto

Atualmente as sessões de chat são armazenadas como arquivos JSON em `docs/chat/history/`. As mensagens não são persistidas entre sessões — o `useChat` do AI SDK guarda tudo em state React, perdido ao fechar o app. O objetivo é migrar para um banco local PostgreSQL embarcado (via PGLite) com Prisma como ORM, persistindo sessões e mensagens para que o histórico seja recarregado ao reabrir uma conversa.

## Decisões

- **Banco:** PGLite (`@electric-sql/pglite`) — PostgreSQL embarcado, arquivo em `docs/chat/chat.db`
- **ORM:** Prisma com driver adapter `pglite-prisma-adapter`
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
  // URL usada apenas pelo CLI (prisma generate). Runtime usa o adapter PGLite.
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

## Estratégia de migrations

`pglite-prisma-adapter` implementa `SqlMigrationAwareDriverAdapterFactory`, o que permite usar o fluxo padrão do Prisma. O setup é feito em dois momentos:

1. **Desenvolvimento:** `pnpm prisma migrate dev` gera os arquivos de migration em `prisma/migrations/`
2. **Runtime (startup do app):** `PrismaService.onModuleInit` chama `prisma.$executeRawUnsafe` com o SQL gerado, ou usa `migrate deploy` via script de bootstrap — a definir na implementação conforme compatibilidade do adapter

Por ora, para simplificar, `onModuleInit` roda um `CREATE TABLE IF NOT EXISTS` inline para garantir que as tabelas existam antes do primeiro uso.

## Arquitetura — Backend (NestJS)

### Novo módulo: `DatabaseModule`

Localização: `server/database/`

Arquivos:
- `database.module.ts` — módulo global (`@Global()`) que provê `PrismaService`
- `prisma.service.ts` — instancia `new PGlite('./docs/chat/chat.db')`, cria `new PrismaPGlite(client)`, expõe `PrismaClient({ adapter })`; no `onModuleInit` cria as tabelas via SQL inline se não existirem e chama `$connect()`; no `onModuleDestroy` chama `$disconnect()`

O módulo é registrado em `AppModule`, tornando `PrismaService` disponível em qualquer módulo sem imports adicionais.

### Mudanças no `ChatModule`

`ChatService` é reescrito para usar `PrismaService` no lugar de `fs`:

| Método | Comportamento |
|--------|---------------|
| `listSessions()` | `prisma.session.findMany({ orderBy: { updatedAt: 'desc' } })` |
| `createSession()` | `prisma.session.create(...)` com `nanoid()` |
| `getSession(id)` | `prisma.session.findUniqueOrThrow({ include: { messages: { orderBy: { createdAt: 'asc' } } } })` |
| `deleteSession(id)` | `prisma.session.delete(...)` — cascade remove mensagens |
| `syncMessages(id, messages)` | Upsert de todas as mensagens + atualiza `title` (primeira mensagem do usuário, máx 80 chars) e `updatedAt` da sessão |
| `streamMessage(...)` | Sem alterações |

`FilesystemModule` é removido dos imports de `ChatModule` (ele continua em `AppModule` pois é usado pelo `PdfModule`).

### Novo endpoint

```
PUT /api/chat/sessions/:id/messages
Body: { messages: UIMessage[] }
```

Chama `chatService.syncMessages`. Extrai o texto de cada message via `parts` (filtra `type === 'text'`; se nenhuma part de texto, usa string vazia). Retorna `204 No Content`.

### Tipos

Os tipos `Session`, `SessionSummary`, `ChatMessageRecord`, `ContextSources` do `chat.service.ts` do servidor são removidos — substituídos pelos tipos gerados pelo Prisma.

## Arquitetura — Frontend (React)

### `chat.service.ts`

A interface `ContextSources` e o campo `contextSources` de `Session` são removidos. `Session` passa a incluir `messages: ChatMessageRecord[]` alinhado com o retorno do Prisma.

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

O `onFinish` do `useChat` recebe a mensagem completa do assistente após o stream terminar — o state `messages` neste momento contém o histórico completo incluindo a última resposta.

```typescript
const { mutate: syncMessages } = useSyncMessages();

onFinish: () => {
  if (realSessionId) syncMessages({ id: realSessionId, messages });
  invalidateSessions();
}
```

## Pacotes a instalar

```bash
pnpm add @prisma/client pglite-prisma-adapter
pnpm add -D prisma
pnpm prisma generate
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
- `server/chat/chat.module.ts` — remover `FilesystemModule` dos imports
- `client/src/features/chat/chat.service.ts` — remover `ContextSources`, adicionar `syncMessages`
- `client/src/features/chat/use-chat-sessions.ts` — adicionar `useSyncMessages`
- `client/src/features/chat/ChatEditor.tsx` — `initialMessages` + `onFinish`

### Removidos
- `docs/chat/history/*.json` (arquivos legados, ignorados)

## Fluxo completo

```
Usuário abre sessão existente
→ GET /api/chat/sessions/:id (inclui messages ordenadas por createdAt)
→ initialMessages passado para useChat
→ histórico renderizado no ChatMessages

Usuário envia mensagem
→ POST /api/chat/sessions/:id/messages (stream, sem mudança)
→ streaming renderizado em tempo real

Stream termina (onFinish)
→ PUT /api/chat/sessions/:id/messages com messages completo
→ servidor faz upsert no banco, atualiza title (≤80 chars) e updatedAt
→ invalidateSessions() atualiza sidebar
```
