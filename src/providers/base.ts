import type { Message, StreamChunk, ToolDefinition, TokenUsage } from '../types.js';

/**
 * LLM Provider interface — ZeroClaw's trait-based pattern.
 * Every provider implements this interface, making them swappable.
 */
export interface LLMProvider {
    /** Provider name (e.g., 'anthropic', 'openai') */
    readonly name: string;

    /**
     * Stream a chat completion.
     * Yields StreamChunks for text, tool calls, and metadata.
     */
    chat(
        messages: Message[],
        options: ChatOptions,
    ): AsyncGenerator<StreamChunk>;

    /**
     * Check if this provider is configured and reachable
     */
    isAvailable(): Promise<boolean>;

    /**
     * Get the model being used
     */
    getModel(): string;
}

export interface ChatOptions {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    tools?: ToolSchema[];
    systemPrompt?: string;
}

export interface ToolSchema {
    name: string;
    description: string;
    parameters: Record<string, unknown>;  // JSON Schema
}

/**
 * Convert ToolDefinition[] to ToolSchema[] for LLM
 */
export function toToolSchemas(tools: ToolDefinition[]): ToolSchema[] {
    return tools.map(t => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
    }));
}

/**
 * Parse a model string like "anthropic/claude-sonnet-4-20250514" → { provider: "anthropic", model: "claude-sonnet-4-20250514" }
 */
export function parseModelString(modelStr: string): { provider: string; model: string } {
    const slashIndex = modelStr.indexOf('/');
    if (slashIndex === -1) {
        return { provider: 'anthropic', model: modelStr };
    }
    return {
        provider: modelStr.slice(0, slashIndex),
        model: modelStr.slice(slashIndex + 1),
    };
}
