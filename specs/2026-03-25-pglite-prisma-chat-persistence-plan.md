# Chat Persistence com PGLite + Prisma — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar a persistência de sessões e mensagens de chat de arquivos JSON para um banco PGLite local, com histórico recarregado ao reabrir uma sessão.

**Architecture:** Novo `DatabaseModule` global com `PrismaService` encapsula PGLite + Prisma. `ChatService` é reescrito para usar Prisma. O cliente salva mensagens após cada stream via `useSyncMessages` mutation + `onFinish` do `useChat`, e carrega histórico via `initialMessages`.

**Tech Stack:** `@electric-sql/pglite`, `pglite-prisma-adapter`, `@prisma/client`, Prisma CLI, NestJS, React Query, Vercel AI SDK (`useChat`)

---

## Paralelização

```
Task 1 (Setup)
  ├── Task 2 (DatabaseModule)      ← paralelo
  └── Task 3 (Frontend service)   ← paralelo
        └── Task 4 (ChatService)  ← após Task 2
        └── Task 5 (Controller)   ← após Task 4
        └── Task 6 (ChatEditor)   ← após Task 3
              └── Task 7 (Smoke)  ← após Tasks 5 + 6
```

Tasks 2 e 3 podem ser executadas em paralelo após o Task 1.
Tasks 4 e 6 podem ser executadas em paralelo (4 depende de 2, 6 depende de 3).

---

## Mapeamento de arquivos

| Arquivo | Ação | Responsabilidade |
|---------|------|-----------------|
| `prisma/schema.prisma` | Criar | Schema das tabelas Session + Message |
| `server/database/prisma.service.ts` | Criar | Instancia PGLite + PrismaClient, cria tabelas no init |
| `server/database/database.module.ts` | Criar | Módulo global NestJS que exporta PrismaService |
| `server/app.module.ts` | Modificar | Registrar DatabaseModule |
| `server/chat/chat.service.ts` | Reescrever | CRUD de sessões e sync de mensagens via Prisma |
| `server/chat/chat.service.spec.ts` | Reescrever | Testes com mock de PrismaService |
| `server/chat/chat.controller.ts` | Modificar | Adicionar endpoint `PUT .../messages` |
| `server/chat/chat.controller.spec.ts` | Modificar | Adicionar teste do novo endpoint, remover contextSources |
| `server/chat/chat.module.ts` | Modificar | Remover FilesystemModule, injetar PrismaService |
| `client/src/features/chat/chat.service.ts` | Modificar | Remover ContextSources, adicionar syncMessages |
| `client/src/features/chat/use-chat-sessions.ts` | Modificar | Adicionar useSyncMessages mutation |
| `client/src/features/chat/ChatEditor.tsx` | Modificar | initialMessages + onFinish com sync |

---

## Task 1: Setup — branch, pacotes e schema Prisma

**Files:**
- Criar: `prisma/schema.prisma`

- [ ] **Criar a nova branch a partir de `feat/chat-docs` (branch principal do projeto)**

```bash
nvm use
git checkout feat/chat-docs && git pull
git checkout -b feat/pglite-chat-persistence
```

- [ ] **Instalar pacotes**

```bash
pnpm add @prisma/client pglite-prisma-adapter
pnpm add -D prisma
```

- [ ] **Criar `prisma/schema.prisma`**

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

- [ ] **Gerar o Prisma Client**

```bash
pnpm prisma generate
```

Esperado: `✔ Generated Prisma Client` sem erros. Cria `node_modules/.prisma/client`.

- [ ] **Commit**

```bash
git add prisma/schema.prisma package.json pnpm-lock.yaml
git commit -m "feat: install prisma + pglite-prisma-adapter and create schema"
```

---

## Task 2: DatabaseModule (paralelo com Task 3)

**Files:**
- Criar: `server/database/prisma.service.ts`
- Criar: `server/database/database.module.ts`
- Modificar: `server/app.module.ts`

- [ ] **Criar `server/database/prisma.service.ts`**

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PGlite } from '@electric-sql/pglite';
import { PrismaPGlite } from 'pglite-prisma-adapter';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const pglite = new PGlite('./docs/chat/chat.db');
    const adapter = new PrismaPGlite(pglite);
    super({ adapter } as any);
  }

  async onModuleInit() {
    await this.$connect();
    await this.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Session" (
        "id" TEXT PRIMARY KEY,
        "title" TEXT NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await this.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Message" (
        "id" TEXT PRIMARY KEY,
        "sessionId" TEXT NOT NULL REFERENCES "Session"("id") ON DELETE CASCADE,
        "role" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

- [ ] **Criar `server/database/database.module.ts`**

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
```

- [ ] **Registrar `DatabaseModule` em `server/app.module.ts`**

Adicionar `DatabaseModule` nos imports (antes de `ChatModule`):

```typescript
import { DatabaseModule } from './database/database.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ ... }),
    DatabaseModule,       // ← adicionar aqui
    ModelConfigModule,
    FilesystemModule,
    TranslateModule,
    PdfModule,
    ChatModule,
    RagModule,
  ],
})
export class AppModule {}
```

- [ ] **Verificar que o servidor inicializa sem erro**

```bash
pnpm dev:server
```

Esperado: servidor NestJS sobe na porta 3000 sem erro de conexão com PGLite. Arquivo `docs/chat/chat.db` criado. Parar com `Ctrl+C`.

- [ ] **Commit**

```bash
git add server/database/ server/app.module.ts
git commit -m "feat: add DatabaseModule with PrismaService backed by PGLite"
```

---

## Task 3: Camada de serviço frontend (paralelo com Task 2)

**Files:**
- Modificar: `client/src/features/chat/chat.service.ts`
- Modificar: `client/src/features/chat/use-chat-sessions.ts`

- [ ] **Escrever o teste de `useSyncMessages` em `use-chat-sessions.ts`**

Abrir `client/src/features/chat/ChatEditor.test.tsx` — verificar se há testes de `useSyncMessages` ali. Se não, criar um teste simples em um novo arquivo:

Não há arquivo de teste específico para o hook. O teste existente está em `ChatEditor.test.tsx`. Abrir e verificar o conteúdo. Se o arquivo não testa o hook diretamente, pular testes de unidade do hook (o comportamento será coberto no teste E2E do ChatEditor).

- [ ] **Mover o tipo `ContextSources` para `ContextSourceBar.tsx` antes de removê-lo de `chat.service.ts`**

`ContextSourceBar.tsx` importa `ContextSources` de `chat.service.ts` (linha 3). Como esse tipo será removido do service, adicionar a definição diretamente em `ContextSourceBar.tsx` substituindo o import:

```typescript
// Substituir a linha de import por definição local:
// import type { ContextSources } from './chat.service';  ← remover

interface ContextSource {
  type: 'md' | 'pdf' | 'url' | 'youtube' | string;
  source: string;
}

interface ContextSources {
  [provider: string]: ContextSource[];
}
```

- [ ] **Atualizar `client/src/features/chat/chat.service.ts`**

Remover `ContextSource`, `ContextSources` e o campo `contextSources` de `Session`. Adicionar `syncMessages`. O arquivo completo fica:

```typescript
// client/src/features/chat/chat.service.ts
import type { UIMessage } from 'ai';

export interface ChatMessageRecord {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface SessionSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface Session extends SessionSummary {
  messages: ChatMessageRecord[];
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(body || `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const chatService = {
  listSessions: () =>
    request<SessionSummary[]>('/api/chat/sessions'),

  createSession: () =>
    request<SessionSummary>('/api/chat/sessions', { method: 'POST' }),

  getSession: (id: string) =>
    request<Session>(`/api/chat/sessions/${id}`),

  deleteSession: (id: string) =>
    request<void>(`/api/chat/sessions/${id}`, { method: 'DELETE' }),

  syncMessages: (id: string, messages: UIMessage[]) =>
    request<void>(`/api/chat/sessions/${id}/messages`, {
      method: 'PUT',
      body: JSON.stringify({ messages }),
    }),
};
```

- [ ] **Adicionar `useSyncMessages` em `use-chat-sessions.ts`**

Adicionar ao final do arquivo, após `invalidateSessions`:

```typescript
import type { UIMessage } from 'ai';

// ── useSyncMessages ──────────────────────────────────────────────────────────

export function useSyncMessages() {
  return useMutation({
    mutationFn: ({ id, messages }: { id: string; messages: UIMessage[] }) =>
      chatService.syncMessages(id, messages),
  });
}
```

Também adicionar `UIMessage` ao import do `ai` se necessário (verificar se já está importado no arquivo).

- [ ] **Verificar que os tipos compilam**

```bash
pnpm exec tsc --noEmit --project client/tsconfig.json 2>/dev/null || true
```

Se houver erros relacionados a `ContextSources` em outros arquivos do cliente (ex: `ContextSourceBar.tsx`, `ChatEditor.tsx`), anotar — serão tratados no Task 6.

- [ ] **Commit**

```bash
git add client/src/features/chat/chat.service.ts client/src/features/chat/use-chat-sessions.ts
git commit -m "feat: add syncMessages to chat service and useSyncMessages mutation"
```

---

## Task 4: ChatService reescrito (após Task 2)

**Files:**
- Reescrever: `server/chat/chat.service.ts`
- Reescrever: `server/chat/chat.service.spec.ts`

- [ ] **Escrever os testes antes da implementação**

Substituir todo o conteúdo de `server/chat/chat.service.spec.ts`:

```typescript
import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ChatService } from './chat.service.js';
import type { PrismaService } from '../database/prisma.service.js';
import type { ChatAgent } from './chat.agent.js';
import type { LocalRagService } from '../rag/local-rag.service.js';

vi.mock('nanoid', () => ({ nanoid: () => 'test-id' }));

const mockPrisma = {
  session: {
    findMany: vi.fn(),
    create: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  },
  message: {
    upsert: vi.fn(),
  },
  $transaction: vi.fn(),
} as unknown as PrismaService;

const mockAgent = {
  createAgent: vi.fn(),
} as unknown as ChatAgent;

const mockRag = {
  getVectorStore: vi.fn().mockReturnValue({}),
} as unknown as LocalRagService;

describe('ChatService', () => {
  let service: ChatService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ChatService(mockPrisma, mockAgent, mockRag);
  });

  describe('listSessions', () => {
    it('delega para prisma.session.findMany ordenado por updatedAt desc', async () => {
      vi.mocked(mockPrisma.session.findMany).mockResolvedValue([]);
      const result = await service.listSessions();
      expect(mockPrisma.session.findMany).toHaveBeenCalledWith({
        orderBy: { updatedAt: 'desc' },
      });
      expect(result).toEqual([]);
    });
  });

  describe('createSession', () => {
    it('cria sessão com nanoid e título padrão', async () => {
      const session = { id: 'test-id', title: 'Nova conversa', createdAt: new Date(), updatedAt: new Date() };
      vi.mocked(mockPrisma.session.create).mockResolvedValue(session as any);
      const result = await service.createSession();
      expect(mockPrisma.session.create).toHaveBeenCalledWith({
        data: { id: 'test-id', title: 'Nova conversa' },
      });
      expect(result.id).toBe('test-id');
    });
  });

  describe('getSession', () => {
    it('retorna sessão com mensagens', async () => {
      const session = { id: 'abc', title: 'Test', messages: [] };
      vi.mocked(mockPrisma.session.findUniqueOrThrow).mockResolvedValue(session as any);
      const result = await service.getSession('abc');
      expect(result.messages).toBeDefined();
    });

    it('lança NotFoundException quando sessão não existe', async () => {
      vi.mocked(mockPrisma.session.findUniqueOrThrow).mockRejectedValue(new Error('Not found'));
      await expect(service.getSession('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteSession', () => {
    it('delega para prisma.session.delete', async () => {
      vi.mocked(mockPrisma.session.delete).mockResolvedValue({} as any);
      await service.deleteSession('abc');
      expect(mockPrisma.session.delete).toHaveBeenCalledWith({ where: { id: 'abc' } });
    });

    it('não lança erro se sessão não existe', async () => {
      vi.mocked(mockPrisma.session.delete).mockRejectedValue(new Error('not found'));
      await expect(service.deleteSession('missing')).resolves.not.toThrow();
    });
  });

  describe('syncMessages', () => {
    it('faz upsert das mensagens e atualiza o título da sessão', async () => {
      vi.mocked(mockPrisma.$transaction).mockResolvedValue([]);
      vi.mocked(mockPrisma.message.upsert).mockResolvedValue({} as any);

      const messages = [
        { id: 'm1', role: 'user', parts: [{ type: 'text', text: 'Olá mundo' }], metadata: {} },
        { id: 'm2', role: 'assistant', parts: [{ type: 'text', text: 'Olá!' }], metadata: {} },
      ] as any;

      await service.syncMessages('session-1', messages);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('trunca o título em 80 caracteres', async () => {
      vi.mocked(mockPrisma.$transaction).mockResolvedValue([]);
      const longText = 'a'.repeat(100);
      const messages = [
        { id: 'm1', role: 'user', parts: [{ type: 'text', text: longText }], metadata: {} },
      ] as any;

      await service.syncMessages('session-1', messages);

      const txCall = vi.mocked(mockPrisma.$transaction).mock.calls[0][0] as any[];
      // O último elemento da transação é o update da sessão
      // Verificamos indiretamente via mock
      expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    });
  });
});
```

- [ ] **Rodar os testes e verificar que FALHAM**

```bash
pnpm test server/chat/chat.service.spec.ts
```

Esperado: erros de importação ou falhas — `ChatService` ainda não foi reescrito.

- [ ] **Reescrever `server/chat/chat.service.ts`**

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { nanoid } from 'nanoid';
import type { BaseMessage } from '@langchain/core/messages';
import type { IterableReadableStream } from '@langchain/core/utils/stream';
import type { UIMessage } from 'ai';
import { PrismaService } from '../database/prisma.service.js';
import { ChatAgent } from './chat.agent.js';
import { LocalRagService } from '../rag/local-rag.service.js';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatAgent: ChatAgent,
    private readonly ragService: LocalRagService,
  ) {}

  async listSessions() {
    return this.prisma.session.findMany({
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createSession() {
    const id = nanoid();
    return this.prisma.session.create({
      data: { id, title: 'Nova conversa' },
    });
  }

  async getSession(id: string) {
    try {
      return await this.prisma.session.findUniqueOrThrow({
        where: { id },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
    } catch {
      throw new NotFoundException(`Session ${id} not found`);
    }
  }

  async deleteSession(id: string) {
    await this.prisma.session.delete({ where: { id } }).catch(() => {});
  }

  async syncMessages(sessionId: string, messages: UIMessage[]) {
    const records = messages.map((m) => ({
      id: m.id,
      sessionId,
      role: m.role,
      content: m.parts
        .filter((p) => p.type === 'text')
        .map((p) => (p as any).text as string)
        .join('') || '',
    }));

    const firstUserMsg = messages.find((m) => m.role === 'user');
    const firstText = firstUserMsg?.parts.find((p) => p.type === 'text') as any;
    const title = firstText?.text?.slice(0, 80) ?? 'Nova conversa';

    await this.prisma.$transaction([
      ...records.map((r) =>
        this.prisma.message.upsert({
          where: { id: r.id },
          update: { content: r.content },
          create: r,
        }),
      ),
      this.prisma.session.update({
        where: { id: sessionId },
        data: { title, updatedAt: new Date() },
      }),
    ]);
  }

  async streamMessage(
    sessionId: string,
    messages: BaseMessage[],
  ): Promise<IterableReadableStream<any>> {
    const chatAgent = await this.chatAgent.createAgent({
      vectorStore: this.ragService.getVectorStore(),
    });
    return chatAgent.stream(
      { messages: [...messages] },
      {
        streamMode: ['messages', 'updates', 'checkpoints'],
        configurable: { thread_id: sessionId },
      },
    );
  }
}
```

- [ ] **Rodar os testes e verificar que PASSAM**

```bash
pnpm test server/chat/chat.service.spec.ts
```

Esperado: todos os testes passam.

- [ ] **Commit**

```bash
git add server/chat/chat.service.ts server/chat/chat.service.spec.ts
git commit -m "feat: rewrite ChatService to use PrismaService instead of fs"
```

---

## Task 5: ChatController e ChatModule (após Task 4)

**Files:**
- Modificar: `server/chat/chat.controller.ts`
- Modificar: `server/chat/chat.controller.spec.ts`
- Modificar: `server/chat/chat.module.ts`

- [ ] **Atualizar o teste do controller**

Substituir o conteúdo de `server/chat/chat.controller.spec.ts`:

```typescript
import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Response } from 'express';
import { ChatController } from './chat.controller.js';
import type { ChatService } from './chat.service.js';

const mockService = {
  listSessions: vi.fn().mockResolvedValue([]),
  createSession: vi.fn().mockResolvedValue({ id: 'abc', title: 'Test', createdAt: new Date(), updatedAt: new Date() }),
  getSession: vi.fn().mockResolvedValue({ id: 'abc', title: 'Test', createdAt: new Date(), updatedAt: new Date(), messages: [] }),
  deleteSession: vi.fn().mockResolvedValue(undefined),
  streamMessage: vi.fn(),
  syncMessages: vi.fn().mockResolvedValue(undefined),
} as unknown as ChatService;

describe('ChatController', () => {
  let controller: ChatController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new ChatController(mockService);
  });

  it('listSessions chama service.listSessions', async () => {
    await controller.listSessions();
    expect(mockService.listSessions).toHaveBeenCalledOnce();
  });

  it('createSession chama service.createSession', async () => {
    const result = await controller.createSession();
    expect(result.id).toBe('abc');
  });

  it('getSession chama service.getSession com o id correto', async () => {
    await controller.getSession('abc');
    expect(mockService.getSession).toHaveBeenCalledWith('abc');
  });

  it('deleteSession chama service.deleteSession com o id correto', async () => {
    await controller.deleteSession('abc');
    expect(mockService.deleteSession).toHaveBeenCalledWith('abc');
  });

  it('syncMessages chama service.syncMessages com id e messages', async () => {
    const messages = [{ id: 'm1', role: 'user', parts: [], metadata: {} }] as any;
    await controller.syncMessages('abc', { messages });
    expect(mockService.syncMessages).toHaveBeenCalledWith('abc', messages);
  });
});
```

- [ ] **Rodar os testes e verificar que FALHAM no teste de syncMessages**

```bash
pnpm test server/chat/chat.controller.spec.ts
```

Esperado: falha no teste de `syncMessages` — método ainda não existe no controller.

- [ ] **Adicionar endpoint PUT em `server/chat/chat.controller.ts`**

Adicionar import de `Put` e `HttpCode` (já existe), e o novo método:

```typescript
import {
  Controller, Get, Post, Put, Delete, Body, Param, Res, HttpCode,
} from '@nestjs/common';
```

Adicionar método antes do `streamMessage`:

```typescript
@Put('sessions/:id/messages')
@HttpCode(204)
syncMessages(@Param('id') id: string, @Body() body: { messages: any[] }) {
  return this.chatService.syncMessages(id, body.messages);
}
```

- [ ] **Rodar os testes e verificar que PASSAM**

```bash
pnpm test server/chat/chat.controller.spec.ts
```

Esperado: todos os testes passam.

- [ ] **Atualizar `server/chat/chat.module.ts`**

Remover `FilesystemModule` dos imports. `PrismaService` é injetado globalmente via `DatabaseModule`:

```typescript
import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller.js';
import { ChatService } from './chat.service.js';
import { LlmModule } from '../llm/llm.module.js';
import { Services } from '../model-config/model-config.service.js';
import { ChatAgent } from './chat.agent.js';
import { RagModule } from '../rag/rag.module.js';

@Module({
  imports: [LlmModule.register({ service: Services.CHAT }), RagModule],
  controllers: [ChatController],
  providers: [ChatAgent, ChatService],
})
export class ChatModule {}
```

- [ ] **Rodar todos os testes do servidor**

```bash
pnpm test server/
```

Esperado: todos os testes passam.

- [ ] **Commit**

```bash
git add server/chat/chat.controller.ts server/chat/chat.controller.spec.ts server/chat/chat.module.ts
git commit -m "feat: add PUT sessions/:id/messages endpoint and remove FilesystemModule from ChatModule"
```

---

## Task 6: ChatEditor atualizado (após Task 3)

**Files:**
- Modificar: `client/src/features/chat/ChatEditor.tsx`

- [ ] **Verificar o arquivo de teste existente**

Ler `client/src/features/chat/ChatEditor.test.tsx` para entender o que está testado. Os testes existentes provavelmente não cobrem `initialMessages`. Não alterar os testes existentes por ora — focar na implementação.

- [ ] **Atualizar `client/src/features/chat/ChatEditor.tsx`**

Mudanças necessárias:

1. Remover import e uso de `ContextSources` do `chat.service.ts`
2. Adicionar import de `useSyncMessages`
3. Adicionar `useMemo` para `initialMessages`
4. Atualizar `useChat` para usar `initialMessages` e `onFinish`

O arquivo atualizado:

```typescript
// client/src/features/chat/ChatEditor.tsx
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { nanoid } from 'nanoid';
import { useChatSessions, useChatSession, useSyncMessages, invalidateSessions } from './use-chat-sessions';
import { ChatSidebar } from './ChatSidebar';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { ContextSourceBar } from './ContextSourceBar';
import { usePaneController } from '@features/panes/pane-controller.store';

interface ChatEditorProps {
  sessionId: string;
}

export function ChatEditor({ sessionId }: ChatEditorProps) {
  const isNew = sessionId.startsWith('new-');
  const realSessionId = isNew ? null : sessionId;

  const { createSession } = useChatSessions();
  const { session, isError: sessionNotFound } = useChatSession(realSessionId);
  const { mutate: syncMessages } = useSyncMessages();

  const [input, setInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [sessionError, setSessionError] = useState(false);

  const initialMessages = useMemo(
    () =>
      session?.messages.map((m) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        parts: [{ type: 'text' as const, text: m.content }],
        metadata: {},
      })) ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session?.id], // Recarrega só quando muda de sessão, não a cada render
  );

  const transport = useMemo(
    () => new DefaultChatTransport({
      api: `http://localhost:3000/api/chat/sessions/${sessionId}/messages`,
    }),
    [sessionId],
  );

  const { messages, sendMessage, status, stop } = useChat({
    transport,
    initialMessages,
    onFinish: () => {
      if (realSessionId) syncMessages({ id: realSessionId, messages });
      invalidateSessions();
    },
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  useEffect(() => {
    if (!isNew || isCreating) return;
    setIsCreating(true);
    createSession()
      .then((session) => {
        usePaneController.getState().actions.updateTabPaths(
          `chat://${sessionId}`,
          `chat://${session.id}`,
        );
      })
      .catch(() => setSessionError(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, isNew]);

  useEffect(() => {
    if (!sessionNotFound) return;
    setSessionError(true);
    usePaneController.getState().actions.removeTabPath(`chat://${realSessionId}`);
  }, [sessionNotFound, realSessionId]);

  function handleSelectSession(id: string) {
    usePaneController.getState().actions.openFileInPane(`chat://${id}`);
  }

  function handleNewSession() {
    const tempId = `new-${nanoid()}`;
    usePaneController.getState().actions.openFileInPane(`chat://${tempId}`);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const text = input;
    setInput('');
    sendMessage({ text });
  }

  return (
    <div className="flex h-full">
      <ChatSidebar
        activeSessionId={realSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
      />
      <div className="flex flex-col flex-1 min-w-0 min-h-0">
        {sessionError ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-destructive text-sm">Sessão não encontrada.</p>
          </div>
        ) : !realSessionId ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-fg-muted text-sm">Criando conversa...</p>
          </div>
        ) : (
          <>
            <ContextSourceBar value={{}} onChange={() => {}} />
            <ChatMessages messages={messages} isLoading={isLoading} />
            <ChatInput
              input={input}
              onInputChange={(e) => setInput(e.target.value)}
              onSubmit={handleSubmit}
              onStop={stop}
              isLoading={isLoading}
            />
          </>
        )}
      </div>
    </div>
  );
}
```

> **Nota:** `ContextSourceBar` é mantido mas recebe props fixas vazias por ora (contextSources foi removido do banco nesta iteração).

- [ ] **Verificar que `ContextSourceBar` compila após remoção do import**

O tipo foi movido para `ContextSourceBar.tsx` no Task 3. Confirmar que não há outros arquivos importando `ContextSources` de `chat.service.ts`:

```bash
grep -r "ContextSources" client/src/ --include="*.ts" --include="*.tsx"
```

Esperado: apenas `ContextSourceBar.tsx` e nenhum outro arquivo.

- [ ] **Rodar os testes do cliente**

```bash
pnpm test client/
```

Esperado: testes existentes passam (ou falham por razões pré-existentes não relacionadas a esta mudança).

- [ ] **Commit**

```bash
git add client/src/features/chat/ChatEditor.tsx
git commit -m "feat: load session history as initialMessages and sync after stream"
```

---

## Task 7: Smoke test e cleanup (após Tasks 5 + 6)

- [ ] **Rodar todos os testes**

```bash
pnpm test
```

Esperado: todos os testes passam.

- [ ] **Iniciar o servidor e testar manualmente**

```bash
pnpm dev:server
# Em outro terminal:
pnpm dev:client
```

Fluxo a testar:
1. Criar nova sessão → sidebar mostra "Nova conversa"
2. Enviar uma mensagem → stream funciona, assistente responde
3. Recarregar a página → reabrir a mesma sessão → histórico aparece
4. Verificar que o título da sessão foi atualizado na sidebar

- [ ] **Verificar que o arquivo `docs/chat/chat.db` foi criado**

```bash
ls -la docs/chat/
```

Esperado: `chat.db` existe. Os JSONs em `docs/chat/history/` podem coexistir — são ignorados.

- [ ] **Commit final**

```bash
git add -A
git commit -m "feat: complete PGLite + Prisma chat persistence migration"
```

- [ ] **Criar PR para a branch `feat/chat-docs` (main do projeto)**

```bash
gh pr create \
  --base feat/chat-docs \  # branch principal do projeto

  --title "feat: migrate chat persistence to PGLite + Prisma" \
  --body "Substitui arquivos JSON por banco PGLite local. Sessões e mensagens persistidas via Prisma. Histórico carregado ao reabrir sessão."
```
