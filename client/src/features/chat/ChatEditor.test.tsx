// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatEditor } from './ChatEditor';

// Mock only the facade hooks — no knowledge of React Query needed
vi.mock('./use-chat-sessions', () => ({
  useChatSessions: vi.fn(() => ({
    sessions: [{ id: 'abc', title: 'Test session', createdAt: '', updatedAt: '' }],
    isLoading: false,
    createSession: vi.fn().mockResolvedValue({ id: 'new123', title: '', createdAt: '', updatedAt: '' }),
    deleteSession: vi.fn(),
  })),
  useChatSession: vi.fn(() => ({
    session: {
      id: 'abc', title: 'Test', createdAt: '', updatedAt: '',
      contextSources: {}, messages: [],
    },
    isLoading: false,
    isError: false,
  })),
  invalidateSessions: vi.fn(),
}));

// Keep @ai-sdk/react, ai, and pane-controller mocks unchanged from before
vi.mock('@ai-sdk/react', () => ({
  useChat: vi.fn(() => ({
    messages: [],
    sendMessage: vi.fn(),
    status: 'idle',
    stop: vi.fn(),
    setMessages: vi.fn(),
    error: undefined,
  })),
}));

vi.mock('ai', () => {
  class TextStreamChatTransport {
    constructor(_opts: unknown) {}
  }
  return { TextStreamChatTransport };
});

vi.mock('@features/panes/pane-controller.store', () => ({
  usePaneController: {
    getState: () => ({
      actions: {
        updateTabPaths: vi.fn(),
        openFileInPane: vi.fn(),
        removeTabPath: vi.fn(),
      },
    }),
  },
}));

describe('ChatEditor', () => {
  it('renderiza sidebar de sessões', () => {
    render(<ChatEditor sessionId="abc" />);
    expect(screen.getByText('Conversas')).toBeInTheDocument();
  });

  it('renderiza área principal quando sessionId é "new-xxx"', () => {
    render(<ChatEditor sessionId="new-tempid" />);
    expect(screen.getByText('Conversas')).toBeInTheDocument();
  });

  it('renderiza input de chat quando sessão está ativa', () => {
    render(<ChatEditor sessionId="abc" />);
    expect(screen.getByPlaceholderText(/Pergunte sobre suas notas/)).toBeInTheDocument();
  });
});
