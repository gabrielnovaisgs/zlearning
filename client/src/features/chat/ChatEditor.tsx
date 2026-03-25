// client/src/features/chat/ChatEditor.tsx
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, TextStreamChatTransport, isTextUIPart } from 'ai';
import { nanoid } from 'nanoid';
import { useChatSessions, useChatSession, invalidateSessions } from './use-chat-sessions';
import type { ContextSources } from './chat.service';
import { ChatSidebar } from './ChatSidebar';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { ContextSourceBar } from './ContextSourceBar';
import { usePaneController } from '@features/panes/pane-controller.store';

interface ChatEditorProps {
  sessionId: string;  // "new-<tempId>" ou "<realId>"
}

export function ChatEditor({ sessionId }: ChatEditorProps) {
  const isNew = sessionId.startsWith('new-');
  const realSessionId = isNew ? null : sessionId;

  const { createSession } = useChatSessions();
  const { session, isError: sessionNotFound } = useChatSession(realSessionId);

  const [input, setInput] = useState('');
  const [contextSources, setContextSources] = useState<ContextSources>({});
  const [isCreating, setIsCreating] = useState(false);
  const [sessionError, setSessionError] = useState(false);
  const contextSourcesRef = useRef(contextSources);
  contextSourcesRef.current = contextSources;



  const transport = useMemo(() => {
    return new DefaultChatTransport({
      api: `http://localhost:3000/api/chat/sessions/${sessionId}/messages`
    });
  }, [sessionId]);


  const { messages, sendMessage, status, stop } = useChat({
    transport,
    onFinish: () => invalidateSessions(),
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

    console.log("session id", sessionId)
    // createSession is a new reference each render (inline arrow in hook); adding it
    // would cause extra re-runs. isCreating guard prevents double-invocation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, isNew]);

  useEffect(() => {
    console.log("messages", messages)
  }, [messages])

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
    console.log("Message", input)
    const text = input;
    setInput('');
    sendMessage({ text });
  }

  useEffect(() => {
    console.log("messages", messages)
  }, [messages])

  // TODO: ao crescer as mensagens o input é empurrado para baixo, ajustar para que ele sempre fique no canto interior sem sumir
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
