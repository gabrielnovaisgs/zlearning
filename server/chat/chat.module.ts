import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller.js';
import { ChatService } from './chat.service.js';
import { FilesystemModule } from '../filesystem/filesystem.module.js';

@Module({
  imports: [FilesystemModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
