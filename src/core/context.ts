import fs from 'fs';
import path from 'path';
import { getWorkspacePath } from '../config/index.js';
import { getConfig } from '../config/index.js';
import { getMemoryManager } from './memory.js';
import { getRulesEngine } from './rules.js';
import type { Message, SkillManifest } from '../types.js';
import { logger } from '../utils/logger.js';

/**
 * Context builder — assembles the system prompt from workspace files,
 * skills, memory, and dynamic rules.
 */
export class ContextBuilder {
    /**
     * Build the full system prompt
     */
    buildSystemPrompt(activeSkills: SkillManifest[] = []): string {
        const wsPath = getWorkspacePath();
        const parts: string[] = [];

        // 1. Core identity files
        const identityFiles = ['SOUL.md', 'IDENTITY.md', 'AGENTS.md', 'TOOLS.md', 'USER.md'];
        for (const file of identityFiles) {
            const filePath = path.join(wsPath, file);
            const content = this.readFile(filePath);
            if (content) {
                parts.push(content);
            }
        }

        // 2. Memory context
        const memory = getMemoryManager();
        const memoryContent = memory.getMemoryFileContents();
        if (memoryContent) {
            parts.push(`\n---\n# Persistent Memory\n${memoryContent}`);
        }

        // 3. Skills context
        if (activeSkills.length > 0) {
            parts.push('\n---\n# Active Skills\n');
            for (const skill of activeSkills) {
                parts.push(`## Skill: ${skill.name}\n${skill.description}\n\n${skill.instructions}\n`);
            }
        }

        // 4. Dynamic behavior rules (hot-reloaded via RulesEngine)
        try {
            const rulesSection = getRulesEngine().getPromptSection();
            if (rulesSection) {
                parts.push(`\n---\n${rulesSection}`);
            }
        } catch {
            // Fallback: read static RULES.md
            const rulesFile = path.join(wsPath, 'RULES.md');
            const rules = this.readFile(rulesFile);
            if (rules) {
                parts.push(`\n---\n# Dynamic Rules\n${rules}`);
            }
        }

        // 5. Timestamp & meta
        parts.push(`\n---\nCurrent date and time: ${new Date().toISOString()}\n`);

        return parts.join('\n\n');
    }

    /**
     * Build the heartbeat prompt (for periodic wake-ups)
     */
    buildHeartbeatPrompt(): string {
        const wsPath = getWorkspacePath();
        const heartbeatFile = path.join(wsPath, 'HEARTBEAT.md');
        return this.readFile(heartbeatFile) || 'Check if there are any pending tasks or notifications.';
    }

    /**
     * Compact/summarize old messages to stay within token limits
     */
    async compactMessages(
        messages: Message[],
        maxTokens: number,
        summarize: (text: string) => Promise<string>,
    ): Promise<Message[]> {
        const config = getConfig();
        const threshold = config.agent.compactionThreshold;

        // Estimate current token count
        const totalChars = messages.reduce((sum, m) => {
            const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
            return sum + content.length;
        }, 0);

        const estimatedTokens = Math.ceil(totalChars / 4);

        if (estimatedTokens < threshold) {
            return messages;  // No compaction needed
        }

        logger.info(`Session compaction triggered: ~${estimatedTokens} tokens > ${threshold} threshold`);

        // Keep the last N messages intact, summarize the rest
        const keepCount = Math.min(10, Math.floor(messages.length / 3));
        const toSummarize = messages.slice(0, messages.length - keepCount);
        const toKeep = messages.slice(messages.length - keepCount);

        // Build summary text
        const summaryText = toSummarize.map(m => {
            const role = m.role;
            const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
            return `[${role}]: ${content.slice(0, 500)}`;
        }).join('\n');

        const summary = await summarize(
            `Summarize this conversation history concisely, preserving key decisions, facts, and context:\n\n${summaryText}`
        );

        const summaryMessage: Message = {
            role: 'system',
            content: `[Conversation summary of ${toSummarize.length} earlier messages]:\n${summary}`,
        };

        return [summaryMessage, ...toKeep];
    }

    private readFile(filePath: string): string | null {
        try {
            if (fs.existsSync(filePath)) {
                return fs.readFileSync(filePath, 'utf-8');
            }
        } catch {
            // ignore
        }
        return null;
    }
}

// Singleton
let contextBuilderInstance: ContextBuilder | null = null;

export function getContextBuilder(): ContextBuilder {
    if (!contextBuilderInstance) {
        contextBuilderInstance = new ContextBuilder();
    }
    return contextBuilderInstance;
}
