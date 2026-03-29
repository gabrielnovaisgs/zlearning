// client/src/features/chat/ChatEditor.tsx
import { useEffect, useMemo, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { nanoid } from 'nanoid';
import {
  useChatSessions,
  useChatSession,
  useSessionMessages,
  useSyncMessages,
  invalidateSessions,
} from './use-chat-sessions';
import { setPendingMessage, consumePendingMessage } from './chat-pending';
import { ChatSidebar } from './ChatSidebar';
import { ChatMessages } from './ChatMessages';
import { ChatInput, type PromptInputMessage } from './ChatInput';
import { usePaneController } from '@features/panes/pane-controller.store';

// ── ChatSession ──────────────────────────────────────────────────────────────
// Owns useChat for a single session. Parent uses key={sessionId} so this
// always mounts fresh with the correct transport and initial messages.

interface ChatSessionProps {
  sessionId: string;
}

function ChatSession({ sessionId }: ChatSessionProps) {
  const { messages: persistedMessages } = useSessionMessages(sessionId);
  const { mutate: syncMessages } = useSyncMessages();

  const initialMessages = useMemo(
    () =>
      persistedMessages.map((m) => ({
        id: m.id,
        role: m.role,
        parts: [{ type: 'text' as const, text: m.content }],
        metadata: {},
      })),
    // key={sessionId} on parent remounts this component when session changes,
    // so sessionId in deps here is only for lint satisfaction
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessionId],
  );

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `http://localhost:3000/api/chat/sessions/${sessionId}/messages`,
      }),
    [sessionId],
  );

  const { messages, sendMessage, status, stop } = useChat({
    transport,
    messages: initialMessages,
    onFinish: ({ messages: finalMessages }) => {
      syncMessages({ id: sessionId, messages: finalMessages });
      invalidateSessions();
    },
  });

  // Consume any message stored by the lazy-creation flow in ChatEditor
  useEffect(() => {
    const pending = consumePendingMessage(sessionId);
    if (pending) sendMessage({ text: pending });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(message: PromptInputMessage) {
    if (!message.text.trim()) return;
    sendMessage({ text: message.text });
  }

  return (
    <>
      <ChatMessages messages={messages} isLoading={status === 'streaming' || status === 'submitted'} />
      <ChatInput onSubmit={handleSubmit} onStop={stop} status={status} />
    </>
  );
}

// ── ChatEditor ───────────────────────────────────────────────────────────────
// Outer shell — stays mounted across session switches (no key in EditorContainer).
// Manages sidebar, navigation, and draft state for new sessions.

interface ChatEditorProps {
  sessionId: string; // "new-<tempId>" | "<realId>"
}

export function ChatEditor({ sessionId }: ChatEditorProps) {
  const isNew = sessionId.startsWith('new-');
  const realSessionId = isNew ? null : sessionId;

  const { createSession } = useChatSessions();
  const { isError: sessionNotFound } = useChatSession(realSessionId);

  const [isCreating, setIsCreating] = useState(false);
  const [sessionError, setSessionError] = useState(false);

  // Reset draft state when tab navigates to a different path
  useEffect(() => {
    setIsCreating(false);
    setSessionError(false);
  }, [sessionId]);

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

  async function handleDraftSubmit(message: PromptInputMessage) {
    const text = message.text.trim();
    if (!text || isCreating) return;
    setIsCreating(true);
    try {
      const session = await createSession();
      setPendingMessage(session.id, text);
      usePaneController.getState().actions.updateTabPaths(
        `chat://${sessionId}`,
        `chat://${session.id}`,
      );
    } catch {
      setSessionError(true);
      setIsCreating(false);
    }
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
        ) : isNew ? (
          <>
            <div className="flex-1" />
            <ChatInput
              onSubmit={handleDraftSubmit}
              onStop={() => {}}
              status={isCreating ? 'submitted' : 'ready'}
            />
          </>
        ) : (
          <ChatSession key={sessionId} sessionId={sessionId} />
        )}
      </div>
    </div>
  );
}
