// client/src/features/chat/ChatSidebar.tsx
import { useChatStore } from './chat.store';
import type { SessionSummary } from './chat.service';

interface ChatSidebarProps {
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return 'hoje';
  if (diff < 172800000) return 'ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function ChatSidebar({ activeSessionId, onSelectSession, onNewSession }: ChatSidebarProps) {
  const sessions = useChatStore((s) => s.sessions);
  const { deleteSession } = useChatStore((s) => s.actions);

  return (
    <div className="flex flex-col h-full w-48 shrink-0 bg-bg-secondary border-r border-border">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Conversas</span>
        <button
          onClick={onNewSession}
          className="text-text-muted hover:text-text-primary text-lg leading-none"
          title="Nova conversa"
        >+</button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 && (
          <p className="px-3 py-4 text-text-muted text-xs">Nenhuma conversa ainda</p>
        )}
        {sessions.map((session: SessionSummary) => (
          <div
            key={session.id}
            onClick={() => onSelectSession(session.id)}
            className={`group flex flex-col px-3 py-2 cursor-pointer border-l-2 transition-colors ${
              activeSessionId === session.id
                ? 'border-accent bg-bg-primary text-accent'
                : 'border-transparent text-text-primary hover:bg-bg-hover'
            }`}
          >
            <span className="text-xs truncate">{session.title}</span>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-[10px] text-text-muted">{formatDate(session.updatedAt)}</span>
              <button
                onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-400 text-xs"
                title="Excluir"
              >×</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
