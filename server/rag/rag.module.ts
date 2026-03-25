import { Module } from '@nestjs/common';
import { LocalRagService } from './local-rag.service.js';
import { LocalRagController } from './local-rag.controller.js';

@Module({
  providers: [LocalRagService],
  controllers: [LocalRagController],
  exports: [LocalRagService]
})
export class RagModule {}
