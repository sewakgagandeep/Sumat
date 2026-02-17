import OpenAI from 'openai';
import type { LLMProvider, ChatOptions } from './base.js';
import type { Message, StreamChunk } from '../types.js';
import { getConfig } from '../config/index.js';
import { logger } from '../utils/logger.js';

/**
 * Ollama provider for local LLM inference.
 * Zero API costs, complete privacy, no internet needed.
 */
export class OllamaProvider implements LLMProvider {
    readonly name = 'ollama';
    private client: OpenAI | null = null;
    private model: string;
    private baseUrl: string;

    constructor() {
        const config = getConfig();
        const providerConfig = config.providers.ollama;
        this.baseUrl = providerConfig?.baseUrl || 'http://localhost:11434';
        this.model = providerConfig?.model || 'llama3.2';

        // Ollama exposes an OpenAI-compatible API at /v1
        this.client = new OpenAI({
            apiKey: 'ollama',  // Ollama doesn't need a real key
            baseURL: `${this.baseUrl}/v1`,
        });
    }

    getModel(): string { return this.model; }

    async isAvailable(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`);
            return response.ok;
        } catch {
            return false;
        }
    }

    async *chat(messages: Message[], options: ChatOptions): AsyncGenerator<StreamChunk> {
        if (!this.client) {
            yield { type: 'error', error: 'Ollama provider not initialized' };
            return;
        }

        // Check if Ollama is running
        if (!await this.isAvailable()) {
            yield { type: 'error', error: `Ollama not reachable at ${this.baseUrl}. Is it running?` };
            return;
        }

        const oaiMessages: OpenAI.ChatCompletionMessageParam[] = [];
        if (options.systemPrompt) {
            oaiMessages.push({ role: 'system', content: options.systemPrompt });
        }
        for (const msg of messages) {
            oaiMessages.push({
                role: msg.role as 'user' | 'assistant' | 'system',
                content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
            });
        }

        // Note: Ollama tool calling support varies by model
        const tools = options.tools?.map(t => ({
            type: 'function' as const,
            function: { name: t.name, description: t.description, parameters: t.parameters },
        }));

        try {
            const stream = await this.client.chat.completions.create({
                model: options.model || this.model,
                messages: oaiMessages,
                stream: true,
                ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
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
                            toolCallBuffers.set(tc.index, { id: tc.id || `ollama_${Date.now()}`, name: tc.function?.name || '', args: '' });
                            yield { type: 'tool_call_start', toolCall: { id: tc.id || '', name: tc.function?.name || '' } };
                        }
                        const buffer = toolCallBuffers.get(tc.index)!;
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
            logger.error('Ollama chat error', { error: err.message });
            yield { type: 'error', error: err.message };
        }
    }
}
