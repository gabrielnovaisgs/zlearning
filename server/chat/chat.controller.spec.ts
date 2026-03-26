import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
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
    const messages = [{ id: 'm1', role: 'user', parts: [{ type: 'text', text: 'hi' }], metadata: {} }] as any;
    await controller.syncMessages('abc', { messages });
    expect(mockService.syncMessages).toHaveBeenCalledWith('abc', messages);
  });
});
