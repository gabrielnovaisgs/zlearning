import { Module } from '@nestjs/common';
import { FilesystemController } from './filesystem.controller.js';
import { FilesystemService } from './filesystem.service.js';

@Module({
  controllers: [FilesystemController],
  providers: [FilesystemService],
})
export class FilesystemModule {}
