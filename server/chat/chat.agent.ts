import { createAgent, SystemMessage, Tool } from "langchain";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { LlmService } from "../llm/llm.service.js";
import { MemorySaver } from "@langchain/langgraph";
import { Injectable } from "@nestjs/common";
import * as z from "zod";
import { tool } from "@langchain/core/tools";
import { VectorStore } from "@langchain/core/vectorstores";
export interface AgentChatProps {
    model?: BaseChatModel;
    vectorStore: VectorStore
}
const retrieveSchema = z.object({ query: z.string() });

@Injectable()
export class ChatAgent {
    constructor(private readonly llmService: LlmService) {}

    private readonly checkpointer: MemorySaver;
    private systemPrompt: SystemMessage = new SystemMessage({content: 'You are a helpful assistant. Be concise'})

    async createAgent({model, vectorStore}: AgentChatProps) {



        const retrieve = tool(
        async ({ query }) => {
            const retrievedDocs = await vectorStore.similaritySearch(query, 2);
            const serialized = retrievedDocs
            .map(
                (doc) => `Source: ${doc.metadata.source}\nContent: ${doc.pageContent}`
            )
            .join("\n");
            return [serialized, retrievedDocs];
        },
        {
            name: "retrieve",
            description: "Retrieve information related to a query.",
            schema: retrieveSchema,
            responseFormat: "content_and_artifact",
        }
        );


        const agent = createAgent({
            systemPrompt: this.systemPrompt,
            model: model || this.llmService.getModel(),
            checkpointer: this.checkpointer,
            tools: [retrieve]
        })
        return agent
    }
}