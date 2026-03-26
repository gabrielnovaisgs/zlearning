import { Injectable, NotFoundException } from '@nestjs/common';
import { nanoid } from 'nanoid';
import type { BaseMessage } from '@langchain/core/messages';
import type { IterableReadableStream } from '@langchain/core/utils/stream';
import type { UIMessage } from 'ai';
import { PrismaService } from '../database/prisma.service.js';
import { ChatAgent } from './chat.agent.js';
import { LocalRagService } from '../rag/local-rag.service.js';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatAgent: ChatAgent,
    private readonly ragService: LocalRagService,
  ) {}

  async listSessions() {
    return this.prisma.session.findMany({
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createSession() {
    const id = nanoid();
    return this.prisma.session.create({
      data: { id, title: 'Nova conversa' },
    });
  }

  async getSession(id: string) {
    try {
      return await this.prisma.session.findUniqueOrThrow({
        where: { id },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
    } catch {
      throw new NotFoundException(`Session ${id} not found`);
    }
  }



  async getSessionMessages(sessionId: string) {
    const session = await this.prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);
    const messages =  await this.prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
    return { messages };
  }

  async deleteSession(id: string) {
    await this.prisma.session.delete({ where: { id } }).catch(() => {});
  }

  async syncMessages(sessionId: string, messages: UIMessage[]) {
    const records = messages.map((m) => ({
      id: m.id,
      sessionId,
      role: m.role,
      content: m.parts
        .filter((p) => p.type === 'text')
        .map((p) => (p as any).text as string)
        .join('') || '',
    }));

    const firstUserMsg = messages.find((m) => m.role === 'user');
    const firstText = firstUserMsg?.parts.find((p) => p.type === 'text') as any;
    const title = firstText?.text?.slice(0, 80) ?? 'Nova conversa';

    await this.prisma.$transaction([
      ...records.map((r) =>
        this.prisma.message.upsert({
          where: { id: r.id },
          update: { content: r.content },
          create: r,
        }),
      ),
      this.prisma.session.update({
        where: { id: sessionId },
        data: { title, updatedAt: new Date() },
      }),
    ]);
  }

  async streamMessage(
    sessionId: string,
    messages: BaseMessage[],
  ): Promise<IterableReadableStream<any>> {
    const chatAgent = await this.chatAgent.createAgent({
      vectorStore: this.ragService.getVectorStore(),
    });
    return chatAgent.stream(
      { messages: [...messages] },
      {
        streamMode: ['messages', 'updates', 'checkpoints'],
        configurable: { thread_id: sessionId },
      },
    );
  }
}
