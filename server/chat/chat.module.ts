import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller.js';
import { ChatService } from './chat.service.js';
import { FilesystemModule } from '../filesystem/filesystem.module.js';
import { LlmModule } from '../llm/llm.module.js';
import { Services } from '../model-config/model-config.service.js';

@Module({
  imports: [FilesystemModule, LlmModule.register({
    service: Services.CHAT
  })],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
