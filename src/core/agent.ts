import type { Message, StreamChunk, ToolCall, ToolResult, IncomingMessage, SkillManifest } from '../types.js';
import { getConfig } from '../config/index.js';
import { getWorkspacePath } from '../config/index.js';
import { getFailoverManager } from '../providers/failover.js';
import { getToolRegistry } from '../tools/registry.js';
import { getSessionManager } from './session.js';
import { getContextBuilder } from './context.js';
import { bus } from '../bus/index.js';
import { logger } from '../utils/logger.js';
import { generateId } from '../utils/crypto.js';
import type { ChatOptions, ToolSchema } from '../providers/base.js';

/**
 * The main Agent Loop — orchestrates LLM interactions, tool execution,
 * and multi-turn conversations. Inspired by Agent Zero's agent loop pattern.
 */
export class Agent {
    private activeSkills: SkillManifest[] = [];

    /**
     * Set active skills for context injection
     */
    setSkills(skills: SkillManifest[]): void {
        this.activeSkills = skills;
    }

    /**
     * Process an incoming message and stream the response.
     * This is the main entry point for all agent interactions.
     */
    async *processMessage(incoming: IncomingMessage): AsyncGenerator<StreamChunk> {
        const config = getConfig();
        const sessionManager = getSessionManager();
        const contextBuilder = getContextBuilder();
        const failover = getFailoverManager();
        const toolRegistry = getToolRegistry();

        // Get or create session
        const session = sessionManager.getOrCreate(
            incoming.channelName,
            incoming.chatId,
            incoming.userId,
        );

        // Check for agent routing (team collaboration)
        if (incoming.channelName !== 'sub-agent') {
            try {
                const { getAgentRouter } = await import('./router.js');
                const router = getAgentRouter();
                if (router.isTeamMode()) {
                    const routeResult = await router.route(incoming.text, session.id);
                    if (routeResult.routed) {
                        yield {
                            type: 'text',
                            text: `🔄 Handing off to specialist agent **${routeResult.agentName}** (Task ID: ${routeResult.taskId})...`,
                        };
                        return;
                    }
                }
            } catch (err: any) {
                logger.warn('Router error', { error: err.message });
            }
        }

        // Add user message to session
        const userMessage: Message = {
            role: 'user',
            content: incoming.text,
        };
        sessionManager.addMessage(session, userMessage);

        // Build system prompt from workspace files + skills + memory
        const systemPrompt = contextBuilder.buildSystemPrompt(this.activeSkills);

        // Get tool schemas for LLM
        const toolSchemas: ToolSchema[] = toolRegistry.getSchemas();

        // Chat options
        const chatOptions: ChatOptions = {
            model: config.agent.model.split('/').pop(),
            maxTokens: config.agent.maxTokens,
            temperature: config.agent.temperature,
            tools: toolSchemas.length > 0 ? toolSchemas : undefined,
            systemPrompt,
        };

        // Emit thinking event
        bus.emit('agent:thinking', { sessionId: session.id });

        // Agent loop — max turns prevent infinite tool-call loops
        let turnCount = 0;
        const maxTurns = config.agent.maxTurns;

        while (turnCount < maxTurns) {
            turnCount++;

            // Compact messages if needed
            const messages = await contextBuilder.compactMessages(
                session.messages,
                config.agent.compactionThreshold,
                async (text) => {
                    // Use the LLM itself to summarize
                    let summary = '';
                    const sumStream = failover.chat(
                        [{ role: 'user', content: text }],
                        { maxTokens: 2048, temperature: 0 },
                    );
                    for await (const chunk of sumStream) {
                        if (chunk.type === 'text' && chunk.text) {
                            summary += chunk.text;
                        }
                    }
                    return summary;
                },
            );

            // Stream LLM response
            let responseText = '';
            const pendingToolCalls: ToolCall[] = [];
            let hasToolCalls = false;

            const stream = failover.chat(messages, chatOptions);
            const { getUsageTracker } = await import('../core/usage.js');

            for await (const chunk of stream) {
                // Track usage if available
                if (chunk.usage) {
                    getUsageTracker().track(
                        config.agent.model.split('/')[0] || 'unknown',
                        config.agent.model.split('/').pop() || 'unknown',
                        chunk.usage.promptTokens,
                        chunk.usage.completionTokens,
                        session.id
                    );
                }

                switch (chunk.type) {
                    case 'text':
                        responseText += chunk.text || '';
                        yield chunk;
                        break;

                    case 'tool_call_start':
                        hasToolCalls = true;
                        yield chunk;
                        break;

                    case 'tool_call_delta':
                        yield chunk;
                        break;

                    case 'tool_call_end':
                        if (chunk.toolCall?.id && chunk.toolCall?.name) {
                            pendingToolCalls.push({
                                id: chunk.toolCall.id,
                                name: chunk.toolCall.name,
                                arguments: chunk.toolCall.arguments as Record<string, unknown> || {},
                            });
                        }
                        yield chunk;
                        break;

                    case 'error':
                        logger.error('Agent stream error', { error: chunk.error });
                        yield chunk;
                        return;

                    case 'done':
                        yield chunk;
                        break;
                }
            }

            // Save assistant response
            if (responseText || pendingToolCalls.length > 0) {
                const assistantMessage: Message = {
                    role: 'assistant',
                    content: responseText,
                    toolCalls: pendingToolCalls.length > 0 ? pendingToolCalls : undefined,
                };
                sessionManager.addMessage(session, assistantMessage);

                if (responseText) {
                    bus.emit('agent:response', { sessionId: session.id, text: responseText });
                }
            }

            // If no tool calls, we're done
            if (pendingToolCalls.length === 0) {
                return;
            }

            // Execute tool calls
            const workspacePath = getWorkspacePath();
            const toolContext = {
                sessionId: session.id,
                userId: incoming.userId,
                channelName: incoming.channelName,
                workspacePath,
                requestApproval: async (description: string): Promise<boolean> => {
                    // Emit approval request and wait for response
                    const approvalId = generateId(8);
                    bus.emit('approval:request', {
                        id: approvalId,
                        description,
                        sessionId: session.id,
                    });

                    try {
                        const response = await bus.waitFor('approval:response', 120_000);
                        return response.approved;
                    } catch {
                        logger.warn('Approval timed out, defaulting to deny');
                        return false;
                    }
                },
                sendMessage: async (content: string): Promise<void> => {
                    bus.emit('message:outgoing', {
                        channelName: incoming.channelName,
                        chatId: incoming.chatId,
                        text: content,
                    });
                },
            };

            // Execute all tool calls
            for (const toolCall of pendingToolCalls) {
                const result = await toolRegistry.execute(toolCall.name, toolCall.arguments, toolContext);

                // Add tool result to session
                const toolMessage: Message = {
                    role: 'tool',
                    content: result.content,
                    toolCallId: toolCall.id,
                    name: toolCall.name,
                };
                sessionManager.addMessage(session, toolMessage);
            }

            // Continue the loop — LLM will see tool results and respond
            logger.debug(`Agent loop turn ${turnCount}/${maxTurns} — ${pendingToolCalls.length} tools executed`);
        }

        // Max turns reached
        logger.warn(`Agent max turns (${maxTurns}) reached`);
        yield { type: 'text', text: '\n\n[Max agent turns reached. Please continue with a new message.]' };
    }

    /**
     * Run a simple one-shot prompt (no session, no tools)
     */
    async prompt(text: string): Promise<string> {
        const failover = getFailoverManager();
        let result = '';

        const stream = failover.chat(
            [{ role: 'user', content: text }],
            { maxTokens: 4096, temperature: 0.7 },
        );

        for await (const chunk of stream) {
            if (chunk.type === 'text' && chunk.text) {
                result += chunk.text;
            }
        }

        return result;
    }
}

// Singleton
let agentInstance: Agent | null = null;

export function getAgent(): Agent {
    if (!agentInstance) {
        agentInstance = new Agent();
    }
    return agentInstance;
}
