import {
  Controller, Get, Post, Delete, Body, Param, Res, HttpCode,
} from '@nestjs/common';
import { toBaseMessages, toUIMessageStream } from '@ai-sdk/langchain';
import { createUIMessageStreamResponse } from 'ai';
import type { UIMessage } from 'ai';
import { Readable } from 'node:stream';
import type { Response } from 'express';
import { ChatService } from './chat.service.js';



@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('sessions')
  listSessions() {
    return this.chatService.listSessions();
  }

  @Post('sessions')
  createSession() {
    return this.chatService.createSession();
  }

  @Get('sessions/:id')
  getSession(@Param('id') id: string) {
    return this.chatService.getSession(id);
  }

  @Delete('sessions/:id')
  @HttpCode(204)
  deleteSession(@Param('id') id: string) {
    return this.chatService.deleteSession(id);
  }

  @Post('sessions/:id/messages')
  async streamMessage(
    @Param('id') id: string,
    @Body() body: any,
    @Res() res: Response,
  ): Promise<void> {
    const { messages }: { messages: UIMessage[] } = body;
    const langChainMessages = await toBaseMessages(messages)
    const langchainStream = await this.chatService.streamMessage(id, langChainMessages, body.contextSources);
    const webResponse = createUIMessageStreamResponse({
      stream: toUIMessageStream(langchainStream),
    });
    res.status(webResponse.status);
    webResponse.headers.forEach((value, key) => res.setHeader(key, value));
    Readable.fromWeb(webResponse.body as any).pipe(res);
  }
}
