// client/src/features/chat/ChatEditor.tsx
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useChat } from '@ai-sdk/react';
import { TextStreamChatTransport } from 'ai';
import { nanoid } from 'nanoid';
import { useChatStore } from './chat.store';
import { chatService, ContextSources } from './chat.service';
import { ChatSidebar } from './ChatSidebar';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { ContextSourceBar } from './ContextSourceBar';
import { usePaneController } from '@features/panes/pane-controller.store';

interface ChatEditorProps {
  sessionId: string;  // "new-<tempId>" ou "<realId>"
}

export function ChatEditor({ sessionId }: ChatEditorProps) {
  const { loadSessions, createSession } = useChatStore((s) => s.actions);
  const [input, setInput] = useState('');
  const [contextSources, setContextSources] = useState<ContextSources>({});
  const [isCreating, setIsCreating] = useState(false);
  const [sessionError, setSessionError] = useState(false);
  const contextSourcesRef = useRef(contextSources);
  contextSourcesRef.current = contextSources;

  const isNew = sessionId.startsWith('new-');
  const realSessionId = isNew ? null : sessionId;

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    transport: new TextStreamChatTransport({
      api: realSessionId
        ? `/api/chat/sessions/${realSessionId}/messages`
        : '/api/chat/sessions/__noop__/messages',
      prepareSendMessagesRequest: ({ messages: msgs }) => ({
        body: {
          content: msgs
            .at(-1)
            ?.parts.filter((p) => p.type === 'text')
            .map((p) => (p as { type: 'text'; text: string }).text)
            .join('') ?? '',
          contextSources: contextSourcesRef.current,
        },
      }),
    }),
    onFinish: () => loadSessions(),
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  // Carrega lista de sessões ao montar
  useEffect(() => {
    loadSessions();
  }, []);

  // Se sessionId for "new-xxx", cria a sessão automaticamente
  useEffect(() => {
    if (!isNew || isCreating) return;
    setIsCreating(true);
    createSession().then((session) => {
      usePaneController.getState().actions.updateTabPaths(
        `chat://${sessionId}`,
        `chat://${session.id}`,
      );
    });
  }, [sessionId]);

  // Carrega histórico quando sessão real está disponível
  useEffect(() => {
    if (!realSessionId) return;
    chatService.getSession(realSessionId).then((session) => {
      setMessages(
        session.messages.map((m) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          parts: [{ type: 'text' as const, text: m.content }],
        })),
      );
      if (Object.keys(session.contextSources).length > 0) {
        setContextSources(session.contextSources);
      }
    }).catch((err: unknown) => {
      // Apenas em 404: exibe erro e remove a tab
      if (err instanceof Error && err.message.includes('(404)')) {
        setSessionError(true);
        usePaneController.getState().actions.removeTabPath(`chat://${realSessionId}`);
      }
    });
  }, [realSessionId]);

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

      <div className="flex flex-col flex-1 min-w-0">
        {sessionError ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-red-400 text-sm">Sessão não encontrada.</p>
          </div>
        ) : !realSessionId ? (
          // Estado de criação — aguardando backend
          <div className="flex flex-1 items-center justify-center">
            <p className="text-text-muted text-sm">Criando conversa...</p>
          </div>
        ) : (
          <>
            <ContextSourceBar value={contextSources} onChange={setContextSources} />
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
