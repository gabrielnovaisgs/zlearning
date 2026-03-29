// client/src/features/chat/ChatInput.tsx
import type { ChatStatus } from 'ai';
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  type PromptInputMessage,
} from '@shared/ai-elements/prompt-input';

export type { PromptInputMessage };

interface ChatInputProps {
  onSubmit: (message: PromptInputMessage) => void;
  onStop: () => void;
  status: ChatStatus;
  disabled?: boolean;
}

export function ChatInput({ onSubmit, onStop, status, disabled }: ChatInputProps) {
  return (
    <PromptInput
      onSubmit={onSubmit}
      className="border-t border-border rounded-none"
    >
      <PromptInputBody>
        <PromptInputTextarea
          placeholder="Pergunte sobre suas notas... (Enter para enviar)"
          disabled={disabled}
        />
      </PromptInputBody>
      <PromptInputFooter>
        <div />
        <PromptInputSubmit status={status} onStop={onStop} />
      </PromptInputFooter>
    </PromptInput>
  );
}
