import { getAgent } from './agent.js';
import { getSessionManager } from './session.js';
import { getMemoryManager } from './memory.js';
import { bus } from '../bus/index.js';
import { logger } from '../utils/logger.js';
import { generateId } from '../utils/crypto.js';
import type { StreamChunk } from '../types.js';

export interface SubAgentTask {
    id: string;
    parentSessionId: string;
    description: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    result?: string;
    error?: string;
    createdAt: Date;
    completedAt?: Date;
}

/**
 * SubAgentManager — spawns background child agents for long-running tasks.
 * Each sub-agent gets its own session and runs asynchronously.
 * Results are reported via the event bus and stored in memory.
 *
 * Inspired by the Agent Zero delegation pattern.
 */
export class SubAgentManager {
    private activeTasks: Map<string, SubAgentTask> = new Map();
    private maxConcurrent: number = 3;

    /**
     * Spawn a background sub-agent for a given task.
     * Returns the task ID immediately — work runs in background.
     */
    async spawn(
        description: string,
        parentSessionId: string,
        options?: { maxTurns?: number }
    ): Promise<SubAgentTask> {
        // Check concurrency limit
        const running = Array.from(this.activeTasks.values()).filter(
            t => t.status === 'running'
        );
        if (running.length >= this.maxConcurrent) {
            throw new Error(
                `Max concurrent sub-agents reached (${this.maxConcurrent}). ` +
                `Wait for a running task to complete.`
            );
        }

        const task: SubAgentTask = {
            id: generateId(8),
            parentSessionId,
            description,
            status: 'pending',
            createdAt: new Date(),
        };

        this.activeTasks.set(task.id, task);
        logger.info(`Sub-agent spawned: ${task.id} — "${description}"`);

        bus.emit('sub-agent:spawn', {
            taskId: task.id,
            description,
            parentSessionId,
        });

        // Run in background (don't await)
        this.executeTask(task).catch(err => {
            logger.error(`Sub-agent ${task.id} unhandled error`, { error: err.message });
        });

        return task;
    }

    /**
     * Execute a sub-agent task in the background.
     */
    private async executeTask(task: SubAgentTask): Promise<void> {
        task.status = 'running';

        try {
            const agent = getAgent();

            // Create a dedicated sub-agent session
            const session = getSessionManager().getOrCreate(
                'sub-agent',
                `sub_${task.id}`,
                'sub-agent'
            );

            // Construct the sub-agent prompt
            const prompt = [
                `You are a sub-agent executing a delegated task.`,
                `Task: ${task.description}`,
                ``,
                `Complete this task thoroughly and report your results.`,
                `Be concise but complete — your output will be returned to the parent agent.`,
            ].join('\n');

            // Use the agent's processMessage to leverage tools
            const incoming = {
                id: `sub_${task.id}`,
                channelName: 'sub-agent',
                chatId: `sub_${task.id}`,
                userId: 'sub-agent',
                text: prompt,
                isGroup: false,
                timestamp: new Date(),
            };

            let result = '';
            const stream = agent.processMessage(incoming);
            for await (const chunk of stream) {
                if (chunk.type === 'text' && chunk.text) {
                    result += chunk.text;
                }
            }

            task.result = result;
            task.status = 'completed';
            task.completedAt = new Date();

            // Store result in memory for parent retrieval
            const memory = getMemoryManager();
            memory.store(
                `sub_agent_result:${task.id}`,
                result.slice(0, 2000),
                'sub-agent'
            );

            logger.info(`Sub-agent ${task.id} completed successfully`);

            bus.emit('sub-agent:complete', {
                taskId: task.id,
                parentSessionId: task.parentSessionId,
                result,
                success: true,
            });

        } catch (err: any) {
            task.status = 'failed';
            task.error = err.message;
            task.completedAt = new Date();

            logger.error(`Sub-agent ${task.id} failed`, { error: err.message });

            bus.emit('sub-agent:complete', {
                taskId: task.id,
                parentSessionId: task.parentSessionId,
                result: `Error: ${err.message}`,
                success: false,
            });
        }
    }

    /**
     * Get the status of a specific sub-agent task.
     */
    getTask(taskId: string): SubAgentTask | undefined {
        return this.activeTasks.get(taskId);
    }

    /**
     * List all sub-agent tasks (optionally filter by status).
     */
    listTasks(status?: SubAgentTask['status']): SubAgentTask[] {
        const tasks = Array.from(this.activeTasks.values());
        if (status) return tasks.filter(t => t.status === status);
        return tasks;
    }

    /**
     * Get results from a completed sub-agent task.
     */
    getResult(taskId: string): string | undefined {
        const task = this.activeTasks.get(taskId);
        return task?.result;
    }
}

// Singleton
let subAgentInstance: SubAgentManager | null = null;

export function getSubAgentManager(): SubAgentManager {
    if (!subAgentInstance) {
        subAgentInstance = new SubAgentManager();
    }
    return subAgentInstance;
}
