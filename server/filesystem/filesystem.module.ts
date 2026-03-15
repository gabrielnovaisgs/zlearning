import { Module } from '@nestjs/common';
import path from 'path';
import { FilesystemController } from './filesystem.controller.js';
import { FilesystemService } from './filesystem.service.js';

export const DOCS_ROOT = path.resolve(process.cwd(), 'docs/files');

@Module({
  controllers: [FilesystemController],
  providers: [FilesystemService],
  exports: [FilesystemService],
})
export class FilesystemModule {}
