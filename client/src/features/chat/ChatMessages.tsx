// client/src/features/chat/ChatMessages.tsx
import type { UIMessage } from 'ai';
import { isTextUIPart } from 'ai';
import { Copy } from 'lucide-react';
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from '@shared/ai-elements/message';

interface ChatMessagesProps {
  messages: UIMessage[];
  isLoading: boolean;
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const lastAssistantIndex = messages.findLastIndex((m) => m.role === 'assistant');

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
      {messages.map((msg, index) => {
        const text = msg.parts.filter(isTextUIPart).map((p) => p.text).join('');
        const isStreamingThis =
          isLoading && msg.role === 'assistant' && index === lastAssistantIndex;

        return (
          <Message key={msg.id} from={msg.role}>
            <MessageContent>
              <MessageResponse isAnimating={isStreamingThis}>
                {text}
              </MessageResponse>
            </MessageContent>
            <MessageActions>
              <MessageAction
                tooltip="Copiar"
                label="Copiar mensagem"
                onClick={() => handleCopy(text)}
              >
                <Copy size={13} />
              </MessageAction>
            </MessageActions>
          </Message>
        );
      })}

      {isLoading && (
        <div className="self-start flex items-center gap-1 px-3 py-2">
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
        </div>
      )}
    </div>
  );
}
