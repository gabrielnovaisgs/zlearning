import { createAgent, SystemMessage } from "langchain";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { LlmService } from "../llm/llm.service.js";
import { MemorySaver } from "@langchain/langgraph";
import { Injectable } from "@nestjs/common";

export interface AgentChatProps {
    model?: BaseChatModel;
}

@Injectable()
export class ChatAgent {
    constructor(private readonly llmService: LlmService) {}

    private readonly checkpointer: MemorySaver;
    private systemPrompt: SystemMessage = new SystemMessage({content: 'You are a helpful assistant. Be concise'})

    async createAgent({model}: AgentChatProps) {
        const agent = createAgent({
            systemPrompt: this.systemPrompt,
            model: model || this.llmService.getModel(),
            checkpointer: this.checkpointer
        })
        return agent
    }
}