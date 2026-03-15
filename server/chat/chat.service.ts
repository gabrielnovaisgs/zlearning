import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { LlmService, ChatMessage } from '../llm/llm.service.js';
import { FilesystemService } from '../filesystem/filesystem.service.js';
import { DOCS_ROOT } from '../filesystem/filesystem.module.js';
import fs from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';

const CHAT_ROOT = path.resolve(process.cwd(), 'docs/chat/history');

export interface ContextSource {
  type: 'md' | 'pdf' | 'url' | 'youtube' | string;
  source: string;
}

export interface ContextSources {
  [provider: string]: ContextSource[];
}

export interface ChatMessageRecord {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface SessionSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface Session extends SessionSummary {
  contextSources: ContextSources;
  messages: ChatMessageRecord[];
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly filesystemService: FilesystemService,
    private readonly llm: LlmService,
  ) {}

  private sessionPath(id: string): string {
    return path.join(CHAT_ROOT, `chat-${id}.json`);
  }

  private async readSession(id: string): Promise<Session> {
    try {
      const raw = await fs.readFile(this.sessionPath(id), 'utf-8');
      return JSON.parse(raw) as Session;
    } catch (err: any) {
      if (err.code === 'ENOENT') throw new NotFoundException(`Session ${id} not found`);
      throw err;
    }
  }

  private async writeSession(session: Session): Promise<void> {
    await fs.mkdir(CHAT_ROOT, { recursive: true });
    await fs.writeFile(
      this.sessionPath(session.id),
      JSON.stringify(session),
    );
  }

  async listSessions(): Promise<SessionSummary[]> {
    try {
      const files = await fs.readdir(CHAT_ROOT);
      const sessions = await Promise.all(
        files
          .filter((f) => f.startsWith('chat-') && f.endsWith('.json'))
          .map(async (f) => {
            const id = f.replace(/^chat-/, '').replace(/\.json$/, '');
            const s = await this.readSession(id);
            return { id: s.id, title: s.title, createdAt: s.createdAt, updatedAt: s.updatedAt };
          }),
      );
      return sessions.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    } catch (err: any) {
      if (err.code === 'ENOENT') return [];
      throw err;
    }
  }

  async createSession(): Promise<SessionSummary> {
    const id = nanoid();
    const now = new Date().toISOString();
    const session: Session = {
      id, title: 'Nova conversa',
      createdAt: now, updatedAt: now,
      contextSources: {}, messages: [],
    };
    await this.writeSession(session);
    const { messages: _, ...summary } = session;
    return summary;
  }

  async getSession(id: string): Promise<Session> {
    return this.readSession(id);
  }

  async deleteSession(id: string): Promise<void> {
    try {
      await fs.unlink(this.sessionPath(id));
    } catch (err: any) {
      if (err.code !== 'ENOENT') throw err;
    }
  }

  async *streamMessage(
    sessionId: string,
    newContent: string,
    contextSources: ContextSources,
  ): AsyncIterable<string> {
    const session = await this.readSession(sessionId);

    // Monta contexto local
    const contextChunks: string[] = [];
    const localSources = contextSources['local'] ?? [];
    for (const src of localSources) {
      try {
        const abs = path.resolve(DOCS_ROOT, src.source);
        if (!abs.startsWith(DOCS_ROOT)) continue; // path traversal guard
        const { content } = await this.filesystemService.readFile(abs);
        contextChunks.push(`### ${src.source}\n${content}`);
      } catch {
        this.logger.warn(`Context source not found: ${src.source}`);
      }
    }

    // Outros providers (web, etc.) ignorados nesta iteração
    for (const provider of Object.keys(contextSources)) {
      if (provider !== 'local') {
        this.logger.warn(`Provider "${provider}" not yet implemented`);
      }
    }

    // Monta messages para o LLM
    const llmMessages: ChatMessage[] = [
      {
        role: 'system',
        content: contextChunks.length
          ? `You are a helpful assistant. Use the following notes as context:\n\n${contextChunks.join('\n\n---\n\n')}`
          : 'You are a helpful assistant.',
      },
      ...session.messages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: newContent },
    ];

    // Persiste mensagem do usuário
    const userMsg: ChatMessageRecord = {
      id: nanoid(), role: 'user', content: newContent,
      createdAt: new Date().toISOString(),
    };
    session.messages.push(userMsg);
    if (session.messages.length === 1) {
      session.title = newContent.slice(0, 50) + (newContent.length > 50 ? '...' : '');
    }
    session.updatedAt = userMsg.createdAt;
    await this.writeSession(session);

    // Stream do LLM
    const provider = this.llm.getProvider();
    let fullResponse = '';
    for await (const chunk of provider.streamComplete(llmMessages)) {
      fullResponse += chunk;
      yield chunk;
    }

    // Persiste resposta do assistente
    const assistantMsg: ChatMessageRecord = {
      id: nanoid(), role: 'assistant', content: fullResponse,
      createdAt: new Date().toISOString(),
    };
    session.messages.push(assistantMsg);
    session.updatedAt = assistantMsg.createdAt;
    await this.writeSession(session);
  }
}
