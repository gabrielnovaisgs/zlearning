import {
  Controller, Get, Post, Delete, Body, Param, Res, HttpCode,
} from '@nestjs/common';
import type { Response } from 'express';
import { ChatService, type ContextSources } from './chat.service.js';

import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsObject()
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
    console.log(body.content)
    const resp = await this.chatService.streamMessage(id, body.content, body.contextSources)
    return res.send(resp)
  }
}
