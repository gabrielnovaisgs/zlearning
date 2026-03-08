import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module.js';
import { TranslateController } from './translate.controller.js';
import { TranslateService } from './translate.service.js';

@Module({
  imports: [LlmModule],
  controllers: [TranslateController],
  providers: [TranslateService],
})
export class TranslateModule {}
