import { describe, it, expect, vi } from 'vitest';

// Simula um stream SSE do OpenRouter
function makeSseStream(lines: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const line of lines) controller.enqueue(encoder.encode(line + '\n'));
      controller.close();
    },
  });
}

describe('OpenRouterProvider.streamComplete (via LlmService)', () => {
  it('yield chunks extraídos do SSE até [DONE]', async () => {
    const sseLines = [
      'data: {"choices":[{"delta":{"content":"Olá"}}]}',
      'data: {"choices":[{"delta":{"content":" mundo"}}]}',
      'data: [DONE]',
    ];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      body: { getReader: () => makeSseStream(sseLines).getReader() },
    }));

    // Importa depois do stub para usar o fetch mockado
    const { LlmService } = await import('./llm.service.js');
    process.env.OPEN_ROUTER_API_KEY = 'test-key';
    const service = new LlmService();
    const provider = service.getProvider();

    const chunks: string[] = [];
    for await (const chunk of provider.streamComplete([{ role: 'user', content: 'hi' }])) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(['Olá', ' mundo']);
  });
});
