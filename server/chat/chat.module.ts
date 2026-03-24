import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller.js';
import { ChatService } from './chat.service.js';
import { FilesystemModule } from '../filesystem/filesystem.module.js';
import { LlmModule } from '../llm/llm.module.js';
import { Services } from '../model-config/model-config.service.js';
import { ChatAgent } from './chat.agent.js';

@Module({
  imports: [FilesystemModule, LlmModule.register({
    service: Services.CHAT
  })],
  controllers: [ChatController],
  providers: [ ChatAgent, ChatService],
})
export class ChatModule {}
