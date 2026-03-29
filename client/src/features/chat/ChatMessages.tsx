// client/src/features/chat/ChatMessages.tsx
import { useState } from 'react';
import type { UIMessage } from 'ai';
import { isTextUIPart } from 'ai';
import { Check, Copy } from 'lucide-react';
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from '@shared/ai-elements/message';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@shared/ai-elements/conversation';

interface ChatMessagesProps {
  messages: UIMessage[];
  isLoading: boolean;
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const lastAssistantIndex = messages.findLastIndex((m) => m.role === 'assistant');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function handleCopy(id: string, text: string) {
    navigator.clipboard.writeText(text).catch(() => { });
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <Conversation className="flex-1">
      <ConversationContent className="gap-3">
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
              <MessageActions className={msg.role === 'user' ? 'ml-auto' : ''}>
                <MessageAction
                  className={copiedId === msg.id ? 'bg-green-300 transition-all text-black' : ''}
                  tooltip={copiedId === msg.id ? 'Copiado!' : 'Copiar'}
                  label="Copiar mensagem"
                  onClick={() => handleCopy(msg.id, text)}
                >
                  {copiedId === msg.id ? <Check size={13} /> : <Copy size={13} />}
                </MessageAction>
              </MessageActions>
            </Message>
          );
        })}

        {isLoading && lastAssistantIndex === -1 && (
          <div className="self-start flex items-center gap-1 px-3 py-2">
            <span className="w-1.5 h-1.5 rounded-full bg-fg-muted animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-fg-muted animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-fg-muted animate-bounce [animation-delay:300ms]" />
          </div>
        )}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}
