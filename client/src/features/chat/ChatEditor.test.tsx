// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatEditor } from './ChatEditor';

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
  useSessionMessages: vi.fn(() => ({
    messages: [],
    isLoading: false,
    isError: false,
    invalidate: vi.fn(),
  })),
  invalidateSessions: vi.fn(),
  useSyncMessages: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}));

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
  class DefaultChatTransport {
    constructor(_opts: unknown) {}
  }
  return {
    TextStreamChatTransport,
    DefaultChatTransport,
    isTextUIPart: (part: { type: string }) => part.type === 'text',
  };
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

vi.mock('./chat-pending', () => ({
  setPendingMessage: vi.fn(),
  consumePendingMessage: vi.fn(() => null),
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

  it('não cria sessão no backend ao montar com sessionId "new-xxx"', async () => {
    const { useChatSessions } = await import('./use-chat-sessions');
    const createSession = vi.fn().mockResolvedValue({ id: 'x', title: '', createdAt: '', updatedAt: '' });
    vi.mocked(useChatSessions).mockReturnValue({
      sessions: [],
      isLoading: false,
      createSession,
      deleteSession: vi.fn(),
    });

    render(<ChatEditor sessionId="new-tempid" />);
    expect(createSession).not.toHaveBeenCalled();
  });

  it('mostra input imediatamente em modo draft sem estado de carregamento', () => {
    render(<ChatEditor sessionId="new-tempid" />);
    const input = screen.getByPlaceholderText(/Pergunte sobre suas notas/);
    expect(input).not.toBeDisabled();
  });
});
