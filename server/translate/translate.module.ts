import { Module } from '@nestjs/common';
import { TranslateController } from './translate.controller.js';
import { TranslateService } from './translate.service.js';
import { LlmModule } from '../llm/llm.module.js';
import { Services } from '../model-config/model-config.service.js';

@Module({
  imports: [LlmModule.register({service: Services.TRANSLATE})],
  controllers: [TranslateController],
  providers: [
    TranslateService,
  ],
})
export class TranslateModule {}
