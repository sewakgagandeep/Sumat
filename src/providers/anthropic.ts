import Anthropic from '@anthropic-ai/sdk';
import type { LLMProvider, ChatOptions, ToolSchema } from './base.js';
import type { Message, StreamChunk } from '../types.js';
import { getConfig } from '../config/index.js';
import { logger } from '../utils/logger.js';

export class AnthropicProvider implements LLMProvider {
    readonly name = 'anthropic';
    private client: Anthropic | null = null;
    private model: string;

    constructor() {
        const config = getConfig();
        const providerConfig = config.providers.anthropic;
        this.model = providerConfig?.model || 'claude-sonnet-4-20250514';

        if (providerConfig?.apiKey) {
            this.client = new Anthropic({
                apiKey: providerConfig.apiKey,
                ...(providerConfig.baseUrl ? { baseURL: providerConfig.baseUrl } : {}),
            });
        }
    }

    getModel(): string {
        return this.model;
    }

    async isAvailable(): Promise<boolean> {
        return this.client !== null;
    }

    async *chat(messages: Message[], options: ChatOptions): AsyncGenerator<StreamChunk> {
        if (!this.client) {
            yield { type: 'error', error: 'Anthropic provider not configured' };
            return;
        }

        const model = options.model || this.model;
        const systemPrompt = options.systemPrompt || '';

        // Convert messages to Anthropic format
        const anthropicMessages = messages
            .filter(m => m.role !== 'system')
            .map(m => this.toAnthropicMessage(m));

        // Build tools
        const tools = options.tools?.map(t => this.toAnthropicTool(t));

        try {
            const stream = this.client.messages.stream({
                model,
                max_tokens: options.maxTokens || 8192,
                temperature: options.temperature ?? 0.7,
                system: systemPrompt,
                messages: anthropicMessages,
                ...(tools && tools.length > 0 ? { tools } : {}),
            });

            let currentToolCallId = '';
            let currentToolName = '';
            let currentToolArgs = '';

            for await (const event of stream) {
                if (event.type === 'content_block_start') {
                    if (event.content_block.type === 'text') {
                        // Text block starting
                    } else if (event.content_block.type === 'tool_use') {
                        currentToolCallId = event.content_block.id;
                        currentToolName = event.content_block.name;
                        currentToolArgs = '';
                        yield {
                            type: 'tool_call_start',
                            toolCall: { id: currentToolCallId, name: currentToolName, arguments: {} },
                        };
                    }
                } else if (event.type === 'content_block_delta') {
                    if (event.delta.type === 'text_delta') {
                        yield { type: 'text', text: event.delta.text };
                    } else if (event.delta.type === 'input_json_delta') {
                        currentToolArgs += event.delta.partial_json;
                        yield {
                            type: 'tool_call_delta',
                            toolCall: { id: currentToolCallId },
                            text: event.delta.partial_json,
                        };
                    }
                } else if (event.type === 'content_block_stop') {
                    if (currentToolCallId) {
                        try {
                            const args = currentToolArgs ? JSON.parse(currentToolArgs) : {};
                            yield {
                                type: 'tool_call_end',
                                toolCall: { id: currentToolCallId, name: currentToolName, arguments: args },
                            };
                        } catch {
                            yield {
                                type: 'tool_call_end',
                                toolCall: { id: currentToolCallId, name: currentToolName, arguments: {} },
                            };
                        }
                        currentToolCallId = '';
                        currentToolName = '';
                        currentToolArgs = '';
                    }
                } else if (event.type === 'message_stop') {
                    // Message complete
                }
            }

            // Get final message for usage
            const finalMessage = await stream.finalMessage();
            yield {
                type: 'done',
                usage: {
                    promptTokens: finalMessage.usage.input_tokens,
                    completionTokens: finalMessage.usage.output_tokens,
                    totalTokens: finalMessage.usage.input_tokens + finalMessage.usage.output_tokens,
                },
            };
        } catch (err: any) {
            logger.error('Anthropic chat error', { error: err.message });
            yield { type: 'error', error: err.message };
        }
    }

    private toAnthropicMessage(msg: Message): Anthropic.MessageParam {
        if (msg.role === 'tool') {
            return {
                role: 'user',
                content: [{
                    type: 'tool_result',
                    tool_use_id: msg.toolCallId || '',
                    content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
                }],
            };
        }

        return {
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: typeof msg.content === 'string'
                ? msg.content
                : msg.content.map(block => {
                    if (block.type === 'image' && block.data) {
                        return {
                            type: 'image' as const,
                            source: {
                                type: 'base64' as const,
                                media_type: (block.mimeType || 'image/png') as 'image/png',
                                data: block.data,
                            },
                        };
                    }
                    return { type: 'text' as const, text: block.text || '' };
                }),
        };
    }

    private toAnthropicTool(tool: ToolSchema): Anthropic.Tool {
        return {
            name: tool.name,
            description: tool.description,
            input_schema: tool.parameters as Anthropic.Tool['input_schema'],
        };
    }
}
