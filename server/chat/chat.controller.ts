import {
  Controller, Get, Post, Delete, Body, Param, Res, HttpCode,
} from '@nestjs/common';
import type { Response } from 'express';
import { ChatService, ContextSources } from './chat.service.js';

interface SendMessageDto {
  content: string;
  contextSources?: ContextSources;
}

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
    @Body() body: SendMessageDto,
    @Res() res: Response,
  ) {
    const newContent = body.content ?? '';
    const contextSources: ContextSources = body.contextSources ?? {};

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      for await (const chunk of this.chatService.streamMessage(id, newContent, contextSources)) {
        res.write(chunk);
      }
    } finally {
      res.end();
    }
  }
}
