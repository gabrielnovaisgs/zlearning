import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '../env.js';
import { ModelConfigService, Providers, Services } from '../model-config/model-config.service.js';
import {ChatOpenRouter} from '@langchain/openrouter'
import {ChatGoogle} from '@langchain/google'
import {ChatOllama} from "@langchain/ollama"

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

@Injectable()
export class LlmService {
  constructor(
    private readonly modelConfig: ModelConfigService,
    @Inject('SERVICE') private service: Services,
    private readonly config: ConfigService<Env, true>,
  ) {}

  getModel() {
    const {model, provider, apiKey} = this.modelConfig.getConfig(this.service);
    switch (provider) {
      case Providers.OPEN_ROUTER:
            return new ChatOpenRouter({model: model, apiKey: apiKey})
      case Providers.GOOGLE:
            return new ChatGoogle({
              apiKey: apiKey,
              model: model,
            });
      case Providers.OLLAMA:
            return new ChatOllama({
              model: model,
              
            })
      default:
            throw new Error(`Provider ${provider} not found`);  
    }
     
  }
}
