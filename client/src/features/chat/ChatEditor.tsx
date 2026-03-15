// client/src/features/chat/ChatEditor.tsx
import { useEffect, useState } from 'react';
import { useChat } from '@ai-sdk/react';
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
  const [contextSources, setContextSources] = useState<ContextSources>({});
  const [isCreating, setIsCreating] = useState(false);
  const [sessionError, setSessionError] = useState(false);

  // ID real da sessão (não "new-xxx")
  const isNew = sessionId.startsWith('new-');
  const realSessionId = isNew ? null : sessionId;

  const { messages, input, handleSubmit, handleInputChange, isLoading, stop, setMessages } = useChat({
    api: realSessionId ? `/api/chat/sessions/${realSessionId}/messages` : '/api/chat/sessions/__noop__/messages',
    streamProtocol: 'text',
    body: { contextSources },
    // Backend espera { content, contextSources }, não messages[].
    // Suprime o envio automático de messages[] pelo SDK.
    experimental_prepareRequestBody: ({ requestBody }) => ({
      content: requestBody.messages.at(-1)?.content ?? '',
      contextSources,
    }),
    onFinish: () => loadSessions(),
  });

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
          content: m.content,
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
              onInputChange={handleInputChange}
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
