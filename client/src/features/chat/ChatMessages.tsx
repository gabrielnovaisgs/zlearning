// client/src/features/chat/ChatMessages.tsx
import type { Message } from '@ai-sdk/react';

interface ChatMessagesProps {
  messages: Message[];
  isLoading: boolean;
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex flex-col gap-1 max-w-[85%] ${
            msg.role === 'user' ? 'self-end items-end' : 'self-start items-start'
          }`}
        >
          <div
            className={`px-3 py-2 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'bg-bg-secondary text-text-primary rounded-br-sm'
                : 'bg-bg-secondary/50 border border-border text-text-primary rounded-bl-sm'
            }`}
          >
            {msg.content}
          </div>
          <span className="text-[10px] text-text-muted px-1">
            {msg.role === 'user' ? 'você' : 'assistente'}
          </span>
        </div>
      ))}

      {isLoading && (
        <div className="self-start flex items-center gap-1 px-3 py-2">
          <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce [animation-delay:300ms]" />
        </div>
      )}
    </div>
  );
}
