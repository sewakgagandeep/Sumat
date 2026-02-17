import OpenAI from 'openai';
import type { LLMProvider, ChatOptions } from './base.js';
import type { Message, StreamChunk } from '../types.js';
import { getConfig } from '../config/index.js';
import { logger } from '../utils/logger.js';

/**
 * GLM Provider (z.ai / Zhipu AI)
 * Uses OpenAI-compatible API endpoint
 */
export class GLMProvider implements LLMProvider {
    readonly name = 'glm';
    private client: OpenAI | null = null;
    private model: string;

    constructor() {
        const config = getConfig();
        const providerConfig = config.providers.glm;
        this.model = providerConfig?.model || 'glm-4.7';

        if (providerConfig?.apiKey) {
            this.client = new OpenAI({
                apiKey: providerConfig.apiKey,
                baseURL: providerConfig.baseUrl || 'https://api.z.ai/api/coding/paas/v4', // User requested z.ai coding endpoint
            });
        }
    }

    getModel(): string { return this.model; }

    async isAvailable(): Promise<boolean> {
        return this.client !== null;
    }

    async *chat(messages: Message[], options: ChatOptions): AsyncGenerator<StreamChunk> {
        if (!this.client) {
            yield { type: 'error', error: 'GLM provider not configured' };
            return;
        }

        const oaiMessages: OpenAI.ChatCompletionMessageParam[] = [];
        if (options.systemPrompt) {
            oaiMessages.push({ role: 'system', content: options.systemPrompt });
        }
        for (const msg of messages) {
            oaiMessages.push(this.toMessage(msg));
        }

        const tools = options.tools?.map(t => ({
            type: 'function' as const,
            function: { name: t.name, description: t.description, parameters: t.parameters },
        }));

        try {
            const stream = await this.client.chat.completions.create({
                model: options.model || this.model,
                messages: oaiMessages,
                max_tokens: options.maxTokens || 8192,
                temperature: options.temperature ?? 0.7,
                stream: true,
                ...(tools && tools.length > 0 ? { tools } : {}),
            });

            const toolCallBuffers: Map<number, { id: string; name: string; args: string }> = new Map();

            for await (const chunk of stream) {
                const choice = chunk.choices?.[0];
                if (!choice) continue;
                const delta = choice.delta;

                if (delta.content) {
                    yield { type: 'text', text: delta.content };
                }

                if (delta.tool_calls) {
                    for (const tc of delta.tool_calls) {
                        if (!toolCallBuffers.has(tc.index)) {
                            toolCallBuffers.set(tc.index, { id: tc.id || '', name: tc.function?.name || '', args: '' });
                            yield { type: 'tool_call_start', toolCall: { id: tc.id || '', name: tc.function?.name || '' } };
                        }
                        const buffer = toolCallBuffers.get(tc.index)!;
                        if (tc.id) buffer.id = tc.id;
                        if (tc.function?.name) buffer.name = tc.function.name;
                        if (tc.function?.arguments) buffer.args += tc.function.arguments;
                    }
                }

                if (choice.finish_reason) {
                    for (const [, buffer] of toolCallBuffers) {
                        const args = buffer.args ? JSON.parse(buffer.args) : {};
                        yield { type: 'tool_call_end', toolCall: { id: buffer.id, name: buffer.name, arguments: args } };
                    }
                    toolCallBuffers.clear();
                }
            }

            yield { type: 'done' };
        } catch (err: any) {
            logger.error('GLM chat error', { error: err.message });
            yield { type: 'error', error: err.message };
        }
    }

    private toMessage(msg: Message): OpenAI.ChatCompletionMessageParam {
        if (msg.role === 'tool') {
            return { role: 'tool', tool_call_id: msg.toolCallId || '', content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) };
        }
        if (msg.role === 'assistant' && msg.toolCalls) {
            return {
                role: 'assistant', content: typeof msg.content === 'string' ? msg.content : null,
                tool_calls: msg.toolCalls.map(tc => ({ id: tc.id, type: 'function' as const, function: { name: tc.name, arguments: JSON.stringify(tc.arguments) } })),
            };
        }
        return { role: msg.role as 'user' | 'assistant', content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) };
    }
}
