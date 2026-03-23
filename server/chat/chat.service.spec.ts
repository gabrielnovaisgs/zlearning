import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FakeListChatModel } from "@langchain/core/utils/testing";

import fs from 'fs/promises';
import { ChatService } from './chat.service.js';
import { LlmService } from '../llm/llm.service.js';

vi.mock('fs/promises');
vi.mock('nanoid', () => ({ nanoid: () => 'test-nano-id' }));

import type { FilesystemService } from '../filesystem/filesystem.service.js';
import { ModelConfigService, Services } from '../model-config/model-config.service.js';
import { ConfigService } from '@nestjs/config';
import { Env } from 'env.js';
import { lastValueFrom, toArray } from 'rxjs';
import { AIMessageChunk, HumanMessage } from 'langchain';

const mockFilesystem = {
  readFile: vi.fn(),
} as unknown as FilesystemService;

const modelConfigService = new ModelConfigService()
const config = new ConfigService<Env, true>()
const chatResponses = ["Olá, me chamo teste", "Essa é uma resposta para sua segunda mensagem"]
const mockLlm: LlmService = {
  getModel: () =>  new FakeListChatModel({
      responses:chatResponses,
    })
  ,
  
} as unknown as LlmService
const realLlmService = new LlmService(modelConfigService, Services.CHAT, config)
describe('ChatService', () => {
  let service: ChatService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ChatService(mockFilesystem, mockLlm);
  });

  describe('listSessions', () => {
    it('retorna lista vazia quando diretório não existe', async () => {
      vi.mocked(fs.readdir).mockRejectedValue(
        Object.assign(new Error('ENOENT'), { code: 'ENOENT' }),
      );
      const result = await service.listSessions();
      expect(result).toEqual([]);
    });

    it('retorna SessionSummary[] sem messages', async () => {
      const session = {
        id: 'abc',
        title: 'Test',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        contextSources: {},
        messages: [{ id: 'm1', role: 'user', content: 'hi', createdAt: '' }],
      };
      vi.mocked(fs.readdir).mockResolvedValue(['chat-abc.json'] as any);
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(session) as any);

      const result = await service.listSessions();
      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty('messages');
      expect(result[0].id).toBe('abc');
      expect(result[0].title).toBe('Test');
    });
  });

  describe('createSession', () => {
    it('cria arquivo JSON com nanoid e retorna session sem messages', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined as any);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await service.createSession();
      expect(result.id).toBe('test-nano-id');
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('chat-test-nano-id.json'),
        expect.stringContaining('"id":"test-nano-id"'),
      );
    });
  });

  describe('getSession', () => {
    it('retorna session com messages', async () => {
      const session = {
        id: 'abc', title: 'Test',
        createdAt: '', updatedAt: '',
        contextSources: {}, messages: [],
      };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(session) as any);
      const result = await service.getSession('abc');
      expect(result.messages).toBeDefined();
    });

    it('lança NotFoundException quando arquivo não existe', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(
        Object.assign(new Error(), { code: 'ENOENT' }),
      );
      await expect(service.getSession('not-found')).rejects.toThrow('not found');
    });
  });

  describe('deleteSession', () => {
    it('deleta o arquivo da sessão', async () => {
      vi.mocked(fs.unlink).mockResolvedValue(undefined);
      await service.deleteSession('abc');
      expect(fs.unlink).toHaveBeenCalledWith(
        expect.stringContaining('chat-abc.json'),
      );
    });
  });

  describe('streamMessage', () => {
    it('deve retornar uma resposta para do modelo', async () => {
      const baseSession = {
        id: 'abc', title: 'Nova conversa',
        createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
        contextSources: {}, messages: [],
      };
      const message = new HumanMessage({content: 'olá, como você se chama? escreva um poema de 100 palavras'})
      const stream = await service.streamMessage(baseSession.id, [message]);
      const chunks: any[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk)
      }
      const aiMessages = chunks.filter(c => c[0] === 'messages').map(c => c[1][0])
      const fullText = aiMessages.map(c => c.content).join('');
      
      expect(fullText).toBe(chatResponses[0]);
      expect(aiMessages[0]).toBeInstanceOf(AIMessageChunk)
    },10000);

  });
});
