import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Response } from 'express';
import { ChatController } from './chat.controller.js';
import type { ChatService } from './chat.service.js';

const mockService = {
  listSessions: vi.fn().mockResolvedValue([]),
  createSession: vi.fn().mockResolvedValue({ id: 'abc', title: 'Test', createdAt: '', updatedAt: '' }),
  getSession: vi.fn().mockResolvedValue({ id: 'abc', title: 'Test', createdAt: '', updatedAt: '', contextSources: {}, messages: [] }),
  deleteSession: vi.fn().mockResolvedValue(undefined),
  streamMessage: vi.fn(),
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

  it('streamMessage chama service.streamMessage com content e contextSources', async () => {
    vi.mocked(mockService.streamMessage).mockResolvedValue('test response');

    const mockRes = {
      send: vi.fn(),
    } as unknown as import('express').Response;

    await controller.streamMessage(
      'abc',
      { content: 'hello', contextSources: {} } as any,
      mockRes,
    );

    expect(mockService.streamMessage).toHaveBeenCalledWith('abc', 'hello', {});
    expect(mockRes.send).toHaveBeenCalledWith('test response');
  });
});
