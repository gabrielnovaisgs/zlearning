import { DynamicModule, Module } from "@nestjs/common";
import { ModelConfigService, Services } from "../model-config/model-config.service.js";
import { LlmService } from "./llm.service.js";
import { ModelConfigModule } from "../model-config/model-config.module.js";


interface options {
    service: Services
}
@Module({
    imports: [ModelConfigModule],
})
export class LlmModule {
    static register(options: options): DynamicModule {
       return {
        module: LlmModule,
        providers: [
            {
                provide: 'SERVICE',
                useValue: options.service,
            },
            LlmService
        ],
        exports: [LlmService]
       }

    }
}