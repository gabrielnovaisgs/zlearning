// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { setPendingMessage, consumePendingMessage } from './chat-pending';

describe('chat-pending', () => {
  it('consumePendingMessage returns null when nothing set', () => {
    expect(consumePendingMessage('session-1')).toBeNull();
  });

  it('consumePendingMessage returns stored text and deletes it', () => {
    setPendingMessage('session-2', 'hello');
    expect(consumePendingMessage('session-2')).toBe('hello');
    expect(consumePendingMessage('session-2')).toBeNull();
  });

  it('messages are keyed by sessionId independently', () => {
    setPendingMessage('a', 'msg-a');
    setPendingMessage('b', 'msg-b');
    expect(consumePendingMessage('b')).toBe('msg-b');
    expect(consumePendingMessage('a')).toBe('msg-a');
  });
});
