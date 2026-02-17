import OpenAI from 'openai';
import type { LLMProvider, ChatOptions, ToolSchema } from './base.js';
import type { Message, StreamChunk } from '../types.js';
import { getConfig } from '../config/index.js';
import { logger } from '../utils/logger.js';

export class OpenAIProvider implements LLMProvider {
    readonly name = 'openai';
    private client: OpenAI | null = null;
    private model: string;

    constructor() {
        const config = getConfig();
        const providerConfig = config.providers.openai;
        this.model = providerConfig?.model || 'gpt-4o';

        if (providerConfig?.apiKey) {
            this.client = new OpenAI({
                apiKey: providerConfig.apiKey,
                ...(providerConfig.baseUrl ? { baseURL: providerConfig.baseUrl } : {}),
            });
        }
    }

    getModel(): string { return this.model; }

    async isAvailable(): Promise<boolean> {
        return this.client !== null;
    }

    async *chat(messages: Message[], options: ChatOptions): AsyncGenerator<StreamChunk> {
        if (!this.client) {
            yield { type: 'error', error: 'OpenAI provider not configured' };
            return;
        }

        const model = options.model || this.model;

        // Build OpenAI messages
        const oaiMessages: OpenAI.ChatCompletionMessageParam[] = [];

        if (options.systemPrompt) {
            oaiMessages.push({ role: 'system', content: options.systemPrompt });
        }

        for (const msg of messages) {
            oaiMessages.push(this.toOpenAIMessage(msg));
        }

        const tools = options.tools?.map(t => this.toOpenAITool(t));

        try {
            const stream = await this.client.chat.completions.create({
                model,
                messages: oaiMessages,
                max_tokens: options.maxTokens || 8192,
                temperature: options.temperature ?? 0.7,
                stream: true,
                stream_options: { include_usage: true },
                ...(tools && tools.length > 0 ? { tools } : {}),
            });

            const toolCallBuffers: Map<number, { id: string; name: string; args: string }> = new Map();

            for await (const chunk of stream) {
                const choice = chunk.choices?.[0];
                if (!choice) {
                    // Final chunk with usage
                    if (chunk.usage) {
                        yield {
                            type: 'done',
                            usage: {
                                promptTokens: chunk.usage.prompt_tokens,
                                completionTokens: chunk.usage.completion_tokens,
                                totalTokens: chunk.usage.total_tokens,
                            },
                        };
                    }
                    continue;
                }

                const delta = choice.delta;

                // Text content
                if (delta.content) {
                    yield { type: 'text', text: delta.content };
                }

                // Tool calls
                if (delta.tool_calls) {
                    for (const tc of delta.tool_calls) {
                        if (!toolCallBuffers.has(tc.index)) {
                            toolCallBuffers.set(tc.index, { id: tc.id || '', name: tc.function?.name || '', args: '' });
                            yield {
                                type: 'tool_call_start',
                                toolCall: { id: tc.id || '', name: tc.function?.name || '', arguments: {} },
                            };
                        }
                        const buffer = toolCallBuffers.get(tc.index)!;
                        if (tc.id) buffer.id = tc.id;
                        if (tc.function?.name) buffer.name = tc.function.name;
                        if (tc.function?.arguments) {
                            buffer.args += tc.function.arguments;
                            yield { type: 'tool_call_delta', toolCall: { id: buffer.id }, text: tc.function.arguments };
                        }
                    }
                }

                // Finish reason
                if (choice.finish_reason === 'tool_calls' || choice.finish_reason === 'stop') {
                    for (const [, buffer] of toolCallBuffers) {
                        try {
                            const args = buffer.args ? JSON.parse(buffer.args) : {};
                            yield {
                                type: 'tool_call_end',
                                toolCall: { id: buffer.id, name: buffer.name, arguments: args },
                            };
                        } catch {
                            yield {
                                type: 'tool_call_end',
                                toolCall: { id: buffer.id, name: buffer.name, arguments: {} },
                            };
                        }
                    }
                    toolCallBuffers.clear();
                }
            }
        } catch (err: any) {
            logger.error('OpenAI chat error', { error: err.message });
            yield { type: 'error', error: err.message };
        }
    }

    private toOpenAIMessage(msg: Message): OpenAI.ChatCompletionMessageParam {
        if (msg.role === 'tool') {
            return {
                role: 'tool',
                tool_call_id: msg.toolCallId || '',
                content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
            };
        }

        if (msg.role === 'assistant' && msg.toolCalls) {
            return {
                role: 'assistant',
                content: typeof msg.content === 'string' ? msg.content : null,
                tool_calls: msg.toolCalls.map(tc => ({
                    id: tc.id,
                    type: 'function' as const,
                    function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
                })),
            };
        }

        if (msg.role === 'assistant') {
            return {
                role: 'assistant' as const,
                content: typeof msg.content === 'string' ? msg.content : msg.content.map(block => ({
                    type: 'text' as const,
                    text: block.text || '',
                })),
            };
        }

        // User messages support text and image content
        return {
            role: 'user' as const,
            content: typeof msg.content === 'string' ? msg.content : msg.content.map(block => {
                if (block.type === 'image' && block.data) {
                    return { type: 'image_url' as const, image_url: { url: `data:${block.mimeType || 'image/png'};base64,${block.data}` } };
                }
                return { type: 'text' as const, text: block.text || '' };
            }),
        };
    }

    private toOpenAITool(tool: ToolSchema): OpenAI.ChatCompletionTool {
        return {
            type: 'function',
            function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters,
            },
        };
    }
}
