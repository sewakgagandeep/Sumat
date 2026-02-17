import type { LLMProvider, ChatOptions } from './base.js';
import type { Message, StreamChunk } from '../types.js';
import { getConfig } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { AnthropicProvider } from './anthropic.js';
import { OpenAIProvider } from './openai.js';
import { OpenRouterProvider } from './openrouter.js';
import { GeminiProvider } from './gemini.js';
import { GLMProvider } from './glm.js';
import { MiniMaxProvider } from './minimax.js';
import { OllamaProvider } from './ollama.js';

/**
 * Multi-provider failover manager.
 * Tries providers in priority order, automatically fails over on errors.
 */
export class FailoverManager {
    private providers: Map<string, LLMProvider> = new Map();
    private priority: string[];
    private healthStatus: Map<string, boolean> = new Map();

    constructor() {
        const config = getConfig();
        this.priority = config.agent.providerPriority;

        // Initialize all configured providers
        this.registerProvider(new AnthropicProvider());
        this.registerProvider(new OpenAIProvider());
        this.registerProvider(new OpenRouterProvider());
        this.registerProvider(new GeminiProvider());
        this.registerProvider(new GLMProvider());
        this.registerProvider(new MiniMaxProvider());
        this.registerProvider(new OllamaProvider());
    }

    private registerProvider(provider: LLMProvider): void {
        this.providers.set(provider.name, provider);
    }

    /**
     * Get the first available provider in priority order
     */
    async getPrimaryProvider(): Promise<LLMProvider | null> {
        for (const name of this.priority) {
            const provider = this.providers.get(name);
            if (provider && await provider.isAvailable()) {
                return provider;
            }
        }
        return null;
    }

    /**
     * Get a specific provider by name
     */
    getProvider(name: string): LLMProvider | undefined {
        return this.providers.get(name);
    }

    /**
     * Get all available providers
     */
    async getAvailableProviders(): Promise<LLMProvider[]> {
        const available: LLMProvider[] = [];
        for (const [, provider] of this.providers) {
            if (await provider.isAvailable()) {
                available.push(provider);
            }
        }
        return available;
    }

    /**
     * Chat with automatic failover.
     * Tries providers in priority order until one succeeds.
     */
    async *chat(messages: Message[], options: ChatOptions): AsyncGenerator<StreamChunk> {
        const config = getConfig();
        const triedProviders: string[] = [];

        for (const providerName of this.priority) {
            const provider = this.providers.get(providerName);
            if (!provider) continue;

            // Skip unavailable providers
            if (!await provider.isAvailable()) continue;

            // Skip providers marked unhealthy (with cooldown)
            if (this.healthStatus.get(providerName) === false) {
                continue;
            }

            triedProviders.push(providerName);
            logger.debug(`Trying provider: ${providerName}`);

            let hadError = false;
            let hasYielded = false;

            try {
                const stream = provider.chat(messages, options);

                for await (const chunk of stream) {
                    if (chunk.type === 'error') {
                        logger.warn(`Provider ${providerName} error: ${chunk.error}`);
                        this.markUnhealthy(providerName);
                        hadError = true;
                        break;
                    }
                    hasYielded = true;
                    yield chunk;
                }

                if (!hadError) {
                    // Success — mark healthy and return
                    this.healthStatus.set(providerName, true);
                    return;
                }
            } catch (err: any) {
                logger.warn(`Provider ${providerName} threw: ${err.message}`);
                this.markUnhealthy(providerName);
                hadError = true;
            }

            // If we already yielded text chunks, we can't retry (streaming started)
            if (hasYielded) {
                yield { type: 'error', error: `Provider ${providerName} failed mid-stream` };
                return;
            }
        }

        // All providers failed
        yield {
            type: 'error',
            error: `All providers failed. Tried: ${triedProviders.join(', ') || 'none available'}. Check your API keys.`,
        };
    }

    /**
     * Mark a provider as unhealthy (with 60s cooldown)
     */
    private markUnhealthy(name: string): void {
        this.healthStatus.set(name, false);
        logger.warn(`Provider ${name} marked unhealthy for 60s`);

        // Reset health after cooldown
        setTimeout(() => {
            this.healthStatus.delete(name);
            logger.info(`Provider ${name} health reset`);
        }, 60_000);
    }

    /**
     * Get status of all providers
     */
    async getStatus(): Promise<Array<{ name: string; available: boolean; healthy: boolean; model: string }>> {
        const status = [];
        for (const [name, provider] of this.providers) {
            const available = await provider.isAvailable();
            const healthy = this.healthStatus.get(name) !== false;
            status.push({ name, available, healthy, model: provider.getModel() });
        }
        return status;
    }
}

// Singleton instance
let failoverInstance: FailoverManager | null = null;

export function getFailoverManager(): FailoverManager {
    if (!failoverInstance) {
        failoverInstance = new FailoverManager();
    }
    return failoverInstance;
}

export function resetFailoverManager(): void {
    failoverInstance = null;
}
