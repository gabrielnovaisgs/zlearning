import { DynamicModule, Global, Module } from '@nestjs/common';
import { ModelConfigService, Services } from './model-config.service.js';
import { ModelConfigController } from './model-config.controller.js';

@Module({
  controllers: [ModelConfigController],
  providers: [ModelConfigService], 
  exports: [ModelConfigService]})
export class ModelConfigModule {
}
