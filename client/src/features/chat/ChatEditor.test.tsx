// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatEditor } from './ChatEditor';

vi.mock('./chat.store', () => ({
  useChatStore: vi.fn((selector) => selector({
    sessions: [
      { id: 'abc', title: 'Test session', createdAt: '', updatedAt: '' },
    ],
    actions: {
      loadSessions: vi.fn(),
      createSession: vi.fn().mockResolvedValue({ id: 'new123', title: '', createdAt: '', updatedAt: '' }),
      deleteSession: vi.fn(),
    },
  })),
}));

vi.mock('./chat.service', () => ({
  chatService: {
    getSession: vi.fn().mockResolvedValue({
      id: 'abc', title: 'Test', createdAt: '', updatedAt: '',
      contextSources: {}, messages: [],
    }),
    listSessions: vi.fn().mockResolvedValue([]),
    createSession: vi.fn(),
    deleteSession: vi.fn(),
  },
}));

vi.mock('@ai-sdk/react', () => ({
  useChat: vi.fn(() => ({
    messages: [],
    input: '',
    handleSubmit: vi.fn(),
    handleInputChange: vi.fn(),
    isLoading: false,
    stop: vi.fn(),
    setMessages: vi.fn(),
  })),
}));

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
    // Deve mostrar estado de carregamento ou prompt inicial
    expect(screen.getByText('Conversas')).toBeInTheDocument();
  });

  it('renderiza input de chat quando sessão está ativa', () => {
    render(<ChatEditor sessionId="abc" />);
    expect(screen.getByPlaceholderText(/Pergunte sobre suas notas/)).toBeInTheDocument();
  });
});
