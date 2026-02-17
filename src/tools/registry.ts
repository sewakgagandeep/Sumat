import type { ToolDefinition, ToolContext, ToolResult, ApprovalLevel } from '../types.js';
import { getConfig } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { bus } from '../bus/index.js';
import { generateId } from '../utils/crypto.js';

/**
 * Tool Registry — ZeroClaw's trait-based pattern.
 * Tools register themselves, and the registry handles dispatch and approval.
 */
export class ToolRegistry {
    private tools: Map<string, ToolDefinition> = new Map();

    register(tool: ToolDefinition): void {
        this.tools.set(tool.name, tool);
        logger.debug(`Tool registered: ${tool.name} [${tool.approvalLevel}]`);
    }

    unregister(name: string): void {
        this.tools.delete(name);
    }

    get(name: string): ToolDefinition | undefined {
        return this.tools.get(name);
    }

    getAll(): ToolDefinition[] {
        return Array.from(this.tools.values());
    }

    /**
     * Get tool schemas for sending to LLM
     */
    getSchemas(): Array<{ name: string; description: string; parameters: Record<string, unknown> }> {
        return this.getAll().map(t => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters,
        }));
    }

    /**
     * Execute a tool with approval gate checks
     */
    async execute(
        name: string,
        args: Record<string, unknown>,
        context: ToolContext,
    ): Promise<ToolResult> {
        const tool = this.tools.get(name);
        if (!tool) {
            return {
                toolCallId: context.sessionId,
                content: `Error: Unknown tool "${name}"`,
                isError: true,
            };
        }

        const config = getConfig();

        // Check approval gate
        if (config.security.approvalGates.enabled) {
            const level = tool.approvalLevel;

            if (level === 'supervised') {
                const description = `Tool: ${name}\nArgs: ${JSON.stringify(args, null, 2)}`;

                logger.info(`Approval required for tool: ${name}`);

                // Emit approval request
                const approvalId = generateId(8);
                bus.emit('approval:request', {
                    id: approvalId,
                    description,
                    sessionId: context.sessionId,
                });

                // Wait for approval response (via Telegram inline button, etc.)
                const approved = await context.requestApproval(description);

                if (!approved) {
                    return {
                        toolCallId: context.sessionId,
                        content: `Tool "${name}" was denied by user.`,
                        isError: false,
                    };
                }
            }
        }

        // Execute the tool
        try {
            logger.info(`Executing tool: ${name}`, { args: Object.keys(args) });
            bus.emit('agent:tool_call', {
                sessionId: context.sessionId,
                toolName: name,
                args,
            });

            const result = await tool.execute(args, context);
            return result;
        } catch (err: any) {
            logger.error(`Tool execution error: ${name}`, { error: err.message });
            return {
                toolCallId: context.sessionId,
                content: `Error executing tool "${name}": ${err.message}`,
                isError: true,
            };
        }
    }
}

// Singleton
let registryInstance: ToolRegistry | null = null;

export function getToolRegistry(): ToolRegistry {
    if (!registryInstance) {
        registryInstance = new ToolRegistry();
    }
    return registryInstance;
}
