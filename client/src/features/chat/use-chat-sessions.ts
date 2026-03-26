import { useQuery, useMutation } from '@tanstack/react-query';
import type { UIMessage } from 'ai';
import { queryClient } from '@shared/query-client';
import { chatService, type SessionSummary, type Session } from './chat.service';

const SESSIONS_KEY = ['chat-sessions'] as const;

// ── useChatSessions ─────────────────────────────────────────────────────────

interface UseChatSessionsReturn {
  sessions: SessionSummary[];
  isLoading: boolean;
  createSession: () => Promise<SessionSummary>;
  deleteSession: (id: string) => void;
}

export function useChatSessions(): UseChatSessionsReturn {
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: SESSIONS_KEY,
    queryFn: () => chatService.listSessions(),
  });

  const createMutation = useMutation({
    mutationFn: () => chatService.createSession(),
    onSuccess: (session) => {
      queryClient.setQueryData<SessionSummary[]>(SESSIONS_KEY, (old) =>
        old ? [session, ...old] : [session],
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => chatService.deleteSession(id),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<SessionSummary[]>(SESSIONS_KEY, (old) =>
        old ? old.filter((s) => s.id !== id) : [],
      );
    },
  });

  return {
    sessions,
    isLoading,
    createSession: () => createMutation.mutateAsync(),
    deleteSession: (id) => deleteMutation.mutate(id),
  };
}

// ── useChatSession ──────────────────────────────────────────────────────────

interface UseChatSessionReturn {
  session: Session | undefined;
  isLoading: boolean;
  isError: boolean;
}

export function useChatSession(id: string | null): UseChatSessionReturn {
  const { data: session, isLoading, isError } = useQuery({
    queryKey: ['chat-session', id] as const,
    queryFn: () => chatService.getSession(id!),
    enabled: Boolean(id),
    retry: false, // don't retry 404s
  });
  return { session, isLoading, isError };
}

// ── invalidateSessions ──────────────────────────────────────────────────────

export function invalidateSessions() {
  return queryClient.invalidateQueries({ queryKey: SESSIONS_KEY });
}

// ── useSyncMessages ──────────────────────────────────────────────────────────

export function useSyncMessages() {
  return useMutation({
    mutationFn: ({ id, messages }: { id: string; messages: UIMessage[] }) =>
      chatService.syncMessages(id, messages),
  });
}
