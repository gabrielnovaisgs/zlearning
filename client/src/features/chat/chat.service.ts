// client/src/features/chat/chat.service.ts
import type { UIMessage } from 'ai';

export interface ChatMessageRecord {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface SessionSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface Session extends SessionSummary {
  messages: ChatMessageRecord[];
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(body || `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const chatService = {
  listSessions: () =>
    request<SessionSummary[]>('/api/chat/sessions'),

  createSession: () =>
    request<SessionSummary>('/api/chat/sessions', { method: 'POST' }),

  getSession: (id: string) =>
    request<Session>(`/api/chat/sessions/${id}`),

  getSessionMessages: (id: string) =>
    request<{ messages: ChatMessageRecord[] }>(`/api/chat/sessions/${id}/messages`),

  deleteSession: (id: string) =>
    request<void>(`/api/chat/sessions/${id}`, { method: 'DELETE' }),

  syncMessages: (id: string, messages: UIMessage[]) =>
    request<void>(`/api/chat/sessions/${id}/messages`, {
      method: 'PUT',
      body: JSON.stringify({ messages }),
    }),
};
