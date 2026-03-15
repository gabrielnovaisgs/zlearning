// client/src/features/chat/chat.store.ts
import { create } from 'zustand';
import { chatService, SessionSummary } from './chat.service';

interface ChatState {
  sessions: SessionSummary[];
  actions: {
    loadSessions(): Promise<void>;
    createSession(): Promise<SessionSummary>;
    deleteSession(id: string): Promise<void>;
  };
}

export const useChatStore = create<ChatState>()((set) => ({
  sessions: [],
  actions: {
    async loadSessions() {
      const sessions = await chatService.listSessions();
      set({ sessions });
    },

    async createSession() {
      const session = await chatService.createSession();
      set((s) => ({ sessions: [session, ...s.sessions] }));
      return session;
    },

    async deleteSession(id) {
      await chatService.deleteSession(id);
      set((s) => ({ sessions: s.sessions.filter((s) => s.id !== id) }));
    },
  },
}));
