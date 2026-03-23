// client/src/features/chat/ChatInput.tsx
import { useRef, type FormEvent, type KeyboardEvent } from 'react';
import { ArrowUp, Square } from 'lucide-react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@shared/ui/input-group';

interface ChatInputProps {
  input: string;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onStop: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function ChatInput({
  input, onInputChange, onSubmit, onStop, isLoading, disabled,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && input.trim()) {
        textareaRef.current?.closest('form')?.requestSubmit();
      }
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="p-3 border-t border-border"
    >
      <InputGroup>
        <InputGroupTextarea
          ref={textareaRef}
          value={input}
          onChange={onInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Pergunte sobre suas notas... (Enter para enviar)"
          disabled={disabled || isLoading}
          rows={1}
          className="min-h-9 max-h-32 overflow-y-auto"
        />
        <InputGroupAddon align="inline-end">
          {isLoading ? (
            <InputGroupButton
              type="button"
              size="icon-sm"
              variant="destructive"
              onClick={onStop}
              aria-label="Parar geração"
            >
              <Square size={14} />
            </InputGroupButton>
          ) : (
            <InputGroupButton
              type="submit"
              size="icon-sm"
              disabled={!input.trim() || !!disabled}
              aria-label="Enviar mensagem"
            >
              <ArrowUp size={14} />
            </InputGroupButton>
          )}
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}
