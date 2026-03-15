// client/src/features/chat/ChatInput.tsx
import { useRef, type FormEvent, type KeyboardEvent } from 'react';

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
      className="flex items-end gap-2 p-3 border-t border-border"
    >
      <textarea
        ref={textareaRef}
        value={input}
        onChange={onInputChange}
        onKeyDown={handleKeyDown}
        placeholder="Pergunte sobre suas notas... (Enter para enviar)"
        disabled={disabled || isLoading}
        rows={1}
        className="flex-1 resize-none bg-bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors min-h-9 max-h-32 overflow-y-auto"
        style={{ fieldSizing: 'content' } as React.CSSProperties}
      />
      {isLoading ? (
        <button
          type="button"
          onClick={onStop}
          className="px-3 py-2 bg-red-500/20 border border-red-500/40 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors h-9"
        >
          ■ parar
        </button>
      ) : (
        <button
          type="submit"
          disabled={!input.trim() || disabled}
          className="px-3 py-2 bg-accent text-bg-primary rounded-lg text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity h-9"
        >
          ↑
        </button>
      )}
    </form>
  );
}
