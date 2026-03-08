import { Module } from '@nestjs/common';
import { FilesystemModule } from './filesystem/filesystem.module.js';
import { TranslateModule } from './translate/translate.module.js';

@Module({
  imports: [FilesystemModule, TranslateModule],
})
export class AppModule {}
