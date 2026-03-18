import { Injectable, Inject } from '@nestjs/common';
import { LlmService } from '../llm/llm.service.js';
import { AIMessageChunk, HumanMessage, MessageStructure, MessageToolSet, SystemMessage } from '@langchain/core/messages';

export interface Example {
  original: string;
  translation: string;
}

const isDev = false


@Injectable()
export class TranslateService {
  constructor(@Inject(LlmService) private readonly llm: LlmService) {}

  async translate(text: string, from: string, to: string): Promise<string> {
   
    const model = this.llm.getModel();

    const prompt = new HumanMessage({
      content: `You are a translation assistant. Translate the following text from ${from} to ${to}. Return only the translation, with no explanations or extra text. \n\n Text to translate: ${text} \n\n`,
    });


    const result = await model.invoke([prompt])  
    return result.content as string
  }

  async getExamples(text: string, from: string, to: string): Promise<Example[]> {
    if (isDev) {
      return [
        { original: `Example 1 using "${text}"`, translation: `Exemplo 1 usando "${text}"` },
        { original: `Example 2 with "${text}"`, translation: `Exemplo 2 com "${text}"` },
        { original: `Example 3 about "${text}"`, translation: `Exemplo 3 sobre "${text}"` },
      ];
    }
   
    const provider = this.llm.getModel();
    const prompt =
      `Give me 3 short example sentences in ${from} that naturally use the word or phrase: "${text}"\n` +
      `For each example provide the original ${from} sentence and its ${to} translation.\n` +
      `Respond ONLY with a JSON array, no markdown, no explanation:\n` +
      `[{"original":"...","translation":"..."},{"original":"...","translation":"..."},{"original":"...","translation":"..."}]`;

    const raw = await provider.invoke(prompt);
    const parsed = extractJson(raw) as Example[];
    if (!Array.isArray(parsed)) throw new Error('Unexpected response shape');
    return parsed
      .filter((e) => typeof e.original === 'string' && typeof e.translation === 'string')
      .slice(0, 3);
  }
}
function extractJson(raw: AIMessageChunk<MessageStructure<MessageToolSet>>): Example[] {
  const content = raw.content;
  if (typeof content !== 'string') {
    throw new Error('Expected string content from LLM');
  }

  // Remove markdown code block markers if present
  const cleaned = content
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    return parsed as Example[];
  } catch (error) {
    console.error('Failed to parse JSON from LLM response:', cleaned);
    throw new Error('Invalid JSON response from LLM');
  }
}

