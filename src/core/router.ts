import { getConfig } from '../config/index.js';
import { getSubAgentManager } from './sub-agent.js';
import { logger } from '../utils/logger.js';

export interface TeamMember {
    name: string;
    model?: string;
    systemPrompt: string;
    triggerPatterns: string[];          // regex patterns to match incoming messages
}

export interface RouteResult {
    routed: boolean;
    agentName?: string;
    taskId?: string;
}

/**
 * AgentRouter — routes incoming messages to specialized agents.
 *
 * When `agent.team` is configured, the router inspects incoming messages
 * and delegates to the best-matching agent. If no match, falls through
 * to the default agent.
 *
 * Inspired by TinyClaw's file-queue pattern.
 */
export class AgentRouter {
    private team: TeamMember[] = [];

    constructor() {
        this.loadTeam();
    }

    /**
     * Load team config from sumat config.
     */
    private loadTeam(): void {
        const config = getConfig();
        const teamConfig = (config.agent as any).team as TeamMember[] | undefined;
        this.team = teamConfig || [];
        if (this.team.length > 0) {
            logger.info(`Agent team loaded: ${this.team.map(t => t.name).join(', ')}`);
        }
    }

    /**
     * Attempt to route a message to a specialized agent.
     * Returns { routed: false } if no match (message should go to default agent).
     */
    async route(text: string, sessionId: string): Promise<RouteResult> {
        if (this.team.length === 0) {
            return { routed: false };
        }

        for (const member of this.team) {
            for (const pattern of member.triggerPatterns) {
                try {
                    const regex = new RegExp(pattern, 'i');
                    if (regex.test(text)) {
                        logger.info(`Routing to agent "${member.name}" (pattern: ${pattern})`);

                        // Delegate to sub-agent with the specialized prompt
                        const taskDescription = [
                            member.systemPrompt,
                            '',
                            `User request: ${text}`,
                        ].join('\n');

                        const subAgent = getSubAgentManager();
                        const task = await subAgent.spawn(taskDescription, sessionId);

                        return {
                            routed: true,
                            agentName: member.name,
                            taskId: task.id,
                        };
                    }
                } catch (err: any) {
                    logger.warn(`Invalid trigger pattern for agent "${member.name}": ${pattern}`);
                }
            }
        }

        return { routed: false };
    }

    /**
     * Check if any team is configured.
     */
    isTeamMode(): boolean {
        return this.team.length > 0;
    }

    /**
     * Get team member list.
     */
    getTeam(): TeamMember[] {
        return [...this.team];
    }

    /**
     * Reload team config (e.g., after config hot-reload).
     */
    reload(): void {
        this.loadTeam();
    }
}

// Singleton
let routerInstance: AgentRouter | null = null;

export function getAgentRouter(): AgentRouter {
    if (!routerInstance) {
        routerInstance = new AgentRouter();
    }
    return routerInstance;
}
