import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs/promises';
import { ChatService } from './chat.service.js';
import type { LlmService } from '../llm/llm.service.js';

vi.mock('fs/promises');
vi.mock('nanoid', () => ({ nanoid: () => 'test-nano-id' }));

import type { FilesystemService } from '../filesystem/filesystem.service.js';

const mockFilesystem = {
  readFile: vi.fn(),
} as unknown as FilesystemService;

const mockLlm = {
  getProvider: vi.fn().mockReturnValue({
    complete: vi.fn(),
    streamComplete: vi.fn(),
  }),
} as unknown as LlmService;

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
    const baseSession = {
      id: 'abc', title: 'Nova conversa',
      createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
      contextSources: {}, messages: [],
    };

    it('persiste user message antes de iniciar stream', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(baseSession) as any);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined as any);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(mockLlm.getModel).mockReturnValue({
        streamComplete: async function* () { yield 'resposta'; },
      });

      const chunks: string[] = [];
      for await (const c of service.streamMessage('abc', 'Olá', {})) {
        chunks.push(c);
      }

      // writeFile chamado pelo menos 2x: user message + assistant message
      expect(fs.writeFile).toHaveBeenCalledTimes(2);
      const firstCall = (fs.writeFile as ReturnType<typeof vi.fn>).mock.calls[0][1] as string;
      expect(JSON.parse(firstCall).messages[0].role).toBe('user');
      expect(JSON.parse(firstCall).messages[0].content).toBe('Olá');
    });

    it('gera título na primeira mensagem (≤50 chars)', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(baseSession) as any);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined as any);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(mockLlm.getModel).mockReturnValue({
        streamComplete: async function* () { yield 'ok'; },
      } as any);

      for await (const _ of service.streamMessage('abc', 'Primeira mensagem curta', {})) { /* noop */ }

      const firstWriteArg = (fs.writeFile as ReturnType<typeof vi.fn>).mock.calls[0][1] as string;
      expect(JSON.parse(firstWriteArg).title).toBe('Primeira mensagem curta');
    });

    it('ignora source local inválida (path traversal guard)', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(baseSession) as any);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined as any);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      // filesystemService.readFile não deve ser chamado pois o guard bloqueia antes
      vi.mocked(mockFilesystem.readFile).mockResolvedValue({ content: 'secret', path: '' } as any);
      vi.mocked(mockLlm.getModel).mockReturnValue({
        streamComplete: async function* () { yield 'ok'; },
      } as any);

      const evilSources = { local: [{ type: 'md', source: '../../../etc/passwd' }] };
      const chunks: string[] = [];
      // não deve lançar exceção
      for await (const c of service.streamMessage('abc', 'teste', evilSources)) {
        chunks.push(c);
      }
      expect(chunks).toContain('ok');
      expect(mockFilesystem.readFile).not.toHaveBeenCalled();
    });

    it('persiste assistant message ao finalizar', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(baseSession) as any);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined as any);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(mockLlm.getModel).mockReturnValue({
        streamComplete: async function* () { yield 'parte1'; yield 'parte2'; },
      } as any);

      for await (const _ of service.streamMessage('abc', 'oi', {})) { /* noop */ }

      const lastWriteArg = (fs.writeFile as ReturnType<typeof vi.fn>).mock.calls.at(-1)![1] as string;
      const saved = JSON.parse(lastWriteArg);
      expect(saved.messages).toHaveLength(2);
      expect(saved.messages[1].role).toBe('assistant');
      expect(saved.messages[1].content).toBe('parte1parte2');
    });

    it('ignora provider "web" silenciosamente e faz log de warning', async () => {
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(baseSession) as any);
      vi.mocked(fs.mkdir).mockResolvedValue(undefined as any);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(mockLlm.getModel).mockReturnValue({
        streamComplete: async function* () { yield 'ok'; },
      } as any);

      const loggerWarnSpy = vi.spyOn((service as any).logger, 'warn');
      const webSources = { web: [{ type: 'url', source: 'https://example.com' }] };

      const chunks: string[] = [];
      // não deve lançar exceção
      for await (const c of service.streamMessage('abc', 'pesquisa', webSources)) {
        chunks.push(c);
      }

      expect(chunks).toContain('ok');
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('"web" not yet implemented'),
      );
    });
  });
});
