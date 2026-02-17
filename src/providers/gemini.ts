import { GoogleGenerativeAI, type GenerativeModel, type Content, type Part } from '@google/generative-ai';
import type { LLMProvider, ChatOptions, ToolSchema } from './base.js';
import type { Message, StreamChunk } from '../types.js';
import { getConfig } from '../config/index.js';
import { logger } from '../utils/logger.js';

export class GeminiProvider implements LLMProvider {
    readonly name = 'gemini';
    private genAI: GoogleGenerativeAI | null = null;
    private model: string;

    constructor() {
        const config = getConfig();
        const providerConfig = config.providers.gemini;
        this.model = providerConfig?.model || 'gemini-2.0-flash';

        if (providerConfig?.apiKey) {
            this.genAI = new GoogleGenerativeAI(providerConfig.apiKey);
        }
    }

    getModel(): string { return this.model; }

    async isAvailable(): Promise<boolean> {
        return this.genAI !== null;
    }

    async *chat(messages: Message[], options: ChatOptions): AsyncGenerator<StreamChunk> {
        if (!this.genAI) {
            yield { type: 'error', error: 'Gemini provider not configured' };
            return;
        }

        const model = this.genAI.getGenerativeModel({
            model: options.model || this.model,
            generationConfig: {
                maxOutputTokens: options.maxTokens || 8192,
                temperature: options.temperature ?? 0.7,
            },
            ...(options.systemPrompt ? { systemInstruction: options.systemPrompt } : {}),
        });

        // Build tools for Gemini
        const tools = options.tools?.length ? [{
            functionDeclarations: options.tools.map(t => ({
                name: t.name,
                description: t.description,
                parameters: t.parameters,
            })),
        }] : undefined;

        // Convert messages to Gemini format
        const contents: Content[] = messages
            .filter(m => m.role !== 'system')
            .map(m => this.toGeminiContent(m));

        try {
            const result = await model.generateContentStream({
                contents,
                ...(tools ? { tools: tools as any } : {}),
            });

            for await (const chunk of result.stream) {
                const candidate = chunk.candidates?.[0];
                if (!candidate?.content?.parts) continue;

                for (const part of candidate.content.parts) {
                    if ('text' in part && part.text) {
                        yield { type: 'text', text: part.text };
                    }
                    if ('functionCall' in part && part.functionCall) {
                        const fc = part.functionCall;
                        const id = `gemini_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
                        yield { type: 'tool_call_start', toolCall: { id, name: fc.name, arguments: {} } };
                        yield { type: 'tool_call_end', toolCall: { id, name: fc.name, arguments: fc.args as Record<string, unknown> || {} } };
                    }
                }
            }

            const response = await result.response;
            const usage = response.usageMetadata;
            yield {
                type: 'done',
                usage: usage ? {
                    promptTokens: usage.promptTokenCount || 0,
                    completionTokens: usage.candidatesTokenCount || 0,
                    totalTokens: usage.totalTokenCount || 0,
                } : undefined,
            };
        } catch (err: any) {
            logger.error('Gemini chat error', { error: err.message });
            yield { type: 'error', error: err.message };
        }
    }

    private toGeminiContent(msg: Message): Content {
        const parts: Part[] = [];

        if (typeof msg.content === 'string') {
            parts.push({ text: msg.content });
        } else {
            for (const block of msg.content) {
                if (block.type === 'text' && block.text) {
                    parts.push({ text: block.text });
                } else if (block.type === 'image' && block.data) {
                    parts.push({
                        inlineData: {
                            mimeType: block.mimeType || 'image/png',
                            data: block.data,
                        },
                    });
                }
            }
        }

        if (msg.role === 'tool') {
            return {
                role: 'function',
                parts: [{ functionResponse: { name: msg.name || 'tool', response: { result: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) } } }],
            };
        }

        return {
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: parts.length > 0 ? parts : [{ text: '' }],
        };
    }
}
