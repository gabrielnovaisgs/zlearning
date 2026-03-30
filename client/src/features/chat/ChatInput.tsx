// client/src/features/chat/ChatInput.tsx
import type { ChatStatus } from 'ai';
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputProvider,
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
    <div className=''>
      <PromptInputProvider>
        <PromptInput

          onSubmit={onSubmit}
          className="m-3"
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
      </PromptInputProvider>
    </div>
  );
}
