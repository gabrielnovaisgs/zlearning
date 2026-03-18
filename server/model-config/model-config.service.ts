import { Global, Inject, Injectable, Optional } from '@nestjs/common';

export enum Services {
    CHAT = 'chat',
    TRANSLATE = 'translate',
}

export enum Providers {
    OPEN_ROUTER = 'openrouter',
    GOOGLE = 'google',
    OLLAMA = 'ollama',
}

export type ModelConfig =  {
    [key in Services]: {
        model: string;
        provider: Providers;
        apiKey?: string;
    }
};


// Responsavel por listar as possiveis configurações de providers e services que temos, ele define o provider para cada tipo de service que será utilizado
// O LLMService apenas retorna o model correto de acordo com a config definida
@Injectable()
export class ModelConfigService {
      private configs: ModelConfig = {
      [Services.CHAT]: { model: 'gemma-3-270m-it', provider: Providers.OPEN_ROUTER,  apiKey: process.env.OPENROUTER_API_KEY},
      [Services.TRANSLATE]: { model: 'gemma-3-1b-it', provider: Providers.GOOGLE, apiKey: process.env.GOOGLE_API_KEY  },
    };

    getConfig(service: Services) {
      if(!this.configs[service].apiKey) {
        throw new Error(`${service} not configured, missing ${this.configs[service].provider} api key`);
      }
      return this.configs[service];
    }

    updateConfig(service: Services, config: { model: string; provider: Providers }) {
      this.configs[service] = config;
    }

}
