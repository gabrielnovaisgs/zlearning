import { Controller } from '@nestjs/common';
import { ModelConfigService } from './model-config.service.js';

@Controller('model-config')
export class ModelConfigController {
  constructor(private readonly modelConfigService: ModelConfigService) {}
}
