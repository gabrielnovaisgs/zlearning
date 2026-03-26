import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FilesystemModule } from './filesystem/filesystem.module.js';
import { TranslateModule } from './translate/translate.module.js';
import { PdfModule } from './pdf/pdf.module.js';
import { ChatModule } from './chat/chat.module.js';
import { env } from './env.js';
import { ModelConfigModule } from './model-config/model-config.module.js';
import { RagModule } from './rag/rag.module.js';
import { DatabaseModule } from './database/database.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../.env',
      load: [() => env],
    }),
    DatabaseModule,
    ModelConfigModule,
    FilesystemModule,
    TranslateModule,
    PdfModule,
    ChatModule,
    RagModule,
  ],
})
export class AppModule {}
