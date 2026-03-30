import { Controller, Post } from "@nestjs/common";
import { LocalRagService } from "./local-rag.service.js";

@Controller('rag')
export class LocalRagController {
    constructor(private readonly ragService: LocalRagService) {}

    @Post('setup')
    async setupVectorStore(){
        await this.ragService.setupVectorStore()
    }
}