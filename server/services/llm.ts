// ── LLM Provider abstraction ───────────────────────────────────────────────
// Add new providers here (e.g. OllamaProvider) and wire them via createLLMProvider()

export interface LLMProvider {
  complete(prompt: string): Promise<string>;
}

// ── OpenRouter ─────────────────────────────────────────────────────────────

export class OpenRouterProvider implements LLMProvider {
  private readonly baseUrl = "https://openrouter.ai/api/v1";

  constructor(
    private readonly apiKey: string,
    private readonly model = "google/gemma-3n-e2b-it:free",
  ) {}

  async complete(prompt: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Study MD",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`OpenRouter error ${response.status}: ${body}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content ?? "";
  }
}

// ── Factory ────────────────────────────────────────────────────────────────
// To add Ollama: implement LLMProvider and switch on an env var here.

export function createLLMProvider(): LLMProvider {
  const apiKey = process.env.OPEN_ROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPEN_ROUTER_API_KEY is not set");
  }
  return new OpenRouterProvider(apiKey);
}
