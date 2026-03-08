import { Injectable, Inject } from '@nestjs/common';
import { LlmService } from '../llm/llm.service.js';

export interface Example {
  original: string;
  translation: string;
}

const isDev =
  process.env.NODE_ENV === 'development' ||
  process.env.NODE_ENV === 'test' ||
  !process.env.NODE_ENV;

function extractJson(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const src = fenced ? fenced[1] : raw;
  const start = src.indexOf('[');
  const end = src.lastIndexOf(']');
  if (start === -1 || end === -1) throw new Error('No JSON array found');
  return JSON.parse(src.slice(start, end + 1));
}

@Injectable()
export class TranslateService {
  constructor(@Inject(LlmService) private readonly llm: LlmService) {}

  async translate(text: string, from: string, to: string): Promise<string> {
    if (isDev) return `${text} (translated from ${from} to ${to})`;

    const provider = this.llm.getProvider();
    const prompt =
      `Translate the following text from ${from} to ${to}. ` +
      `Return only the translation, with no explanations or extra text.\n\n${text}`;
    return (await provider.complete(prompt)).trim();
  }

  async getExamples(text: string, from: string, to: string): Promise<Example[]> {
    if (isDev) {
      return [
        { original: `Example 1 using "${text}"`, translation: `Exemplo 1 usando "${text}"` },
        { original: `Example 2 with "${text}"`, translation: `Exemplo 2 com "${text}"` },
        { original: `Example 3 about "${text}"`, translation: `Exemplo 3 sobre "${text}"` },
      ];
    }

    const provider = this.llm.getProvider();
    const prompt =
      `Give me 3 short example sentences in ${from} that naturally use the word or phrase: "${text}"\n` +
      `For each example provide the original ${from} sentence and its ${to} translation.\n` +
      `Respond ONLY with a JSON array, no markdown, no explanation:\n` +
      `[{"original":"...","translation":"..."},{"original":"...","translation":"..."},{"original":"...","translation":"..."}]`;

    const raw = await provider.complete(prompt);
    const parsed = extractJson(raw) as Example[];
    if (!Array.isArray(parsed)) throw new Error('Unexpected response shape');
    return parsed
      .filter((e) => typeof e.original === 'string' && typeof e.translation === 'string')
      .slice(0, 3);
  }
}
