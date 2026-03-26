// client/src/features/chat/ChatEditor.tsx
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { nanoid } from 'nanoid';
import { useChatSessions, useChatSession, useSyncMessages, invalidateSessions } from './use-chat-sessions';
import { ChatSidebar } from './ChatSidebar';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { usePaneController } from '@features/panes/pane-controller.store';

interface ChatEditorProps {
  sessionId: string;  // "new-<tempId>" ou "<realId>"
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

  // Build initialMessages from persisted session data.
  // Depends on session?.id so it resets only when the session changes, not on every render.
  const initialMessages = useMemo(
    () =>
      session?.messages.map((m) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        parts: [{ type: 'text' as const, text: m.content }],
        metadata: {},
      })) ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session?.id],
  );

  const transport = useMemo(() => {
    return new DefaultChatTransport({
      api: `http://localhost:3000/api/chat/sessions/${sessionId}/messages`,
    });
  }, [sessionId]);

  const { messages, sendMessage, status, stop } = useChat({
    transport,
    messages: initialMessages,
    onFinish: ({ messages: finalMessages }) => {
      if (realSessionId) syncMessages({ id: realSessionId, messages: finalMessages });
      invalidateSessions();
    },
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  // Se sessionId for "new-xxx", cria a sessão automaticamente
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
      .catch(() => {
        setSessionError(true);
      });
    // createSession is a new reference each render (inline arrow in hook); adding it
    // would cause extra re-runs. isCreating guard prevents double-invocation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, isNew]);

  // Trata erro 404: exibe erro e remove a tab
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
          // Estado de criação — aguardando backend
          <div className="flex flex-1 items-center justify-center">
            <p className="text-fg-muted text-sm">Criando conversa...</p>
          </div>
        ) : (
          <>
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
