import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { LlmService, ChatMessage } from '../llm/llm.service.js';
import { FilesystemService } from '../filesystem/filesystem.service.js';
import { DOCS_ROOT } from '../filesystem/filesystem.module.js';

import { createAgent, SystemMessage } from "langchain";
import fs from 'fs/promises';
import path from 'path';
import { nanoid } from 'nanoid';
import type { BaseMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { IterableReadableStream } from '@langchain/core/utils/stream';

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
  private readonly checkpointer: MemorySaver;

  constructor(
    private readonly filesystemService: FilesystemService,
    private readonly llmService: LlmService,
    
  ) {
   
    this.checkpointer = new MemorySaver();
  }

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

  async streamMessage(
    sessionId: string,
    messages: BaseMessage[],
    contextSources?: ContextSources,
  ): Promise<IterableReadableStream<any>> {
    
    const config = {
      configurable: {
        thread_id: sessionId,
      }
    }
    const model = this.llmService.getModel();
    const chatAgent = createAgent({
      model,
      checkpointer: this.checkpointer
    })
    
    const system = new SystemMessage({content: 'You are a helpful assistant. Be concise'})
    const stream = await chatAgent.stream({messages: [system, ...messages]}, {
      streamMode: ['messages', 'updates', 'checkpoints'],
      configurable: config.configurable
     }, )
     return stream
  
    
  }
}
