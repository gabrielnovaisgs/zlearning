import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { FakeListChatModel } from '@langchain/core/utils/testing';
import { AIMessageChunk, HumanMessage } from 'langchain';
import { ChatService } from './chat.service.js';
import type { PrismaService } from '../database/prisma.service.js';
import { LlmService } from '../llm/llm.service.js';
import { ModelConfigService, Services } from '../model-config/model-config.service.js';
import { ConfigService } from '@nestjs/config';
import type { Env } from 'env.js';
import { ChatAgent } from './chat.agent.js';
import type { LocalRagService } from '../rag/local-rag.service.js';
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory';
import { OllamaEmbeddings } from '@langchain/ollama';

vi.mock('nanoid', () => ({ nanoid: () => 'test-nano-id' }));

// Mock PrismaService
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

// Mock ChatAgent for unit tests
const mockChatAgent = {
  createAgent: vi.fn(),
} as unknown as ChatAgent;

// Mock LocalRagService for unit tests
const mockRagService = {
  getVectorStore: vi.fn(),
} as unknown as LocalRagService;

// For streamMessage integration test
const chatResponses = ['Olá, me chamo teste'];

describe('ChatService', () => {
  describe('with mocked dependencies', () => {
    let service: ChatService;

    beforeEach(() => {
      vi.clearAllMocks();
      service = new ChatService(mockPrisma, mockChatAgent, mockRagService);
    });

    describe('listSessions', () => {
      it('retorna lista de sessões ordenadas por updatedAt', async () => {
        const sessions = [
          { id: 'abc', title: 'Test', createdAt: new Date(), updatedAt: new Date() },
        ];
        vi.mocked(mockPrisma.session.findMany).mockResolvedValue(sessions as any);

        const result = await service.listSessions();
        expect(result).toEqual(sessions);
        expect(mockPrisma.session.findMany).toHaveBeenCalledWith({
          orderBy: { updatedAt: 'desc' },
        });
      });
    });

    describe('createSession', () => {
      it('cria sessão com nanoid e título padrão', async () => {
        const created = { id: 'test-nano-id', title: 'Nova conversa', createdAt: new Date(), updatedAt: new Date() };
        vi.mocked(mockPrisma.session.create).mockResolvedValue(created as any);

        const result = await service.createSession();
        expect(result.id).toBe('test-nano-id');
        expect(mockPrisma.session.create).toHaveBeenCalledWith({
          data: { id: 'test-nano-id', title: 'Nova conversa' },
        });
      });
    });

    describe('getSession', () => {
      it('retorna sessão com messages quando encontrada', async () => {
        const session = {
          id: 'abc', title: 'Test',
          createdAt: new Date(), updatedAt: new Date(),
          messages: [],
        };
        vi.mocked(mockPrisma.session.findUniqueOrThrow).mockResolvedValue(session as any);

        const result = await service.getSession('abc');
        expect(result.messages).toBeDefined();
        expect(result.id).toBe('abc');
      });

      it('lança NotFoundException quando sessão não existe', async () => {
        vi.mocked(mockPrisma.session.findUniqueOrThrow).mockRejectedValue(new Error('Not found'));

        await expect(service.getSession('not-found')).rejects.toThrow(NotFoundException);
      });
    });

    describe('deleteSession', () => {
      it('deleta a sessão pelo id', async () => {
        vi.mocked(mockPrisma.session.delete).mockResolvedValue({} as any);

        await service.deleteSession('abc');
        expect(mockPrisma.session.delete).toHaveBeenCalledWith({ where: { id: 'abc' } });
      });

      it('não lança erro quando sessão não existe', async () => {
        vi.mocked(mockPrisma.session.delete).mockRejectedValue(new Error('Not found'));

        await expect(service.deleteSession('not-found')).resolves.toBeUndefined();
      });
    });

    describe('syncMessages', () => {
      it('faz upsert das mensagens e atualiza o título da sessão', async () => {
        vi.mocked(mockPrisma.$transaction).mockResolvedValue([] as any);
        vi.mocked(mockPrisma.message.upsert).mockReturnValue({} as any);
        vi.mocked(mockPrisma.session.update).mockReturnValue({} as any);

        const messages = [
          {
            id: 'msg-1',
            role: 'user' as const,
            parts: [{ type: 'text', text: 'Olá mundo' }],
          },
          {
            id: 'msg-2',
            role: 'assistant' as const,
            parts: [{ type: 'text', text: 'Resposta' }],
          },
        ] as any[];

        await service.syncMessages('session-1', messages);

        expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
        const transactionArgs = vi.mocked(mockPrisma.$transaction).mock.calls[0][0] as any[];
        // 2 message upserts + 1 session update
        expect(transactionArgs).toHaveLength(3);
      });

      it('usa "Nova conversa" como título quando não há mensagem de usuário', async () => {
        vi.mocked(mockPrisma.$transaction).mockResolvedValue([] as any);
        vi.mocked(mockPrisma.message.upsert).mockReturnValue({} as any);
        vi.mocked(mockPrisma.session.update).mockReturnValue({} as any);

        const messages = [
          {
            id: 'msg-1',
            role: 'assistant' as const,
            parts: [{ type: 'text', text: 'Resposta' }],
          },
        ] as any[];

        await service.syncMessages('session-1', messages);
        expect(mockPrisma.$transaction).toHaveBeenCalled();
      });
    });
  });

  describe('streamMessage', () => {
    it('deve retornar uma resposta do modelo', async () => {
      const modelConfigService = new ModelConfigService();
      const config = new ConfigService<Env, true>();
      const mockLlm: LlmService = {
        getModel: () => new FakeListChatModel({ responses: chatResponses }),
      } as unknown as LlmService;

      const chatAgent = new ChatAgent(mockLlm);
      const ragService = {
        getVectorStore: () => new MemoryVectorStore(new OllamaEmbeddings({ model: 'qwen3-embedding:4b' })),
      } as unknown as LocalRagService;

      const service = new ChatService(mockPrisma, chatAgent, ragService);

      const message = new HumanMessage({ content: 'olá, como você se chama? escreva um poema de 100 palavras' });
      const stream = await service.streamMessage('test-session', [message]);
      const chunks: any[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const aiMessages = chunks.filter((c) => c[0] === 'messages').map((c) => c[1][0]);
      const fullText = aiMessages.map((c) => c.content).join('');

      expect(fullText).toBe(chatResponses[0]);
      expect(aiMessages[0]).toBeInstanceOf(AIMessageChunk);
    }, 10000);
  });
});
