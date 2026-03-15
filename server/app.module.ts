import { Module } from '@nestjs/common';
import { FilesystemModule } from './filesystem/filesystem.module.js';
import { TranslateModule } from './translate/translate.module.js';
import { PdfModule } from './pdf/pdf.module.js';
import { ChatModule } from './chat/chat.module.js';

@Module({
  imports: [FilesystemModule, TranslateModule, PdfModule, ChatModule],
})
export class AppModule {}
