import { Module } from '@nestjs/common';
import { FilesystemModule } from './filesystem/filesystem.module.js';
import { TranslateModule } from './translate/translate.module.js';
import { PdfModule } from './pdf/pdf.module.js';

@Module({
  imports: [FilesystemModule, TranslateModule, PdfModule],
})
export class AppModule {}
