import { Controller, Post, Body, Inject, BadRequestException } from '@nestjs/common';
import { TranslateService } from './translate.service.js';

interface TranslateBody {
  text?: string;
  from?: string;
  to?: string;
}

@Controller('translate')
export class TranslateController {
  constructor(@Inject(TranslateService) private readonly translateService: TranslateService) {}

  @Post()
  async translate(@Body() body: TranslateBody) {
    const { text, from = 'en', to = 'pt' } = body;
    if (!text?.trim()) throw new BadRequestException('text is required');
    const translation = await this.translateService.translate(text, from, to);
    return { translation };
  }

  @Post('examples')
  async examples(@Body() body: TranslateBody) {
    const { text, from = 'en', to = 'pt' } = body;
    if (!text?.trim()) throw new BadRequestException('text is required');
    const examples = await this.translateService.getExamples(text, from, to);
    return { examples };
  }
}
