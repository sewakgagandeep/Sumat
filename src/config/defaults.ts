import type { SumatConfig } from '../types.js';

/**
 * Default configuration values.
 * These are overridden by config.json and environment variables.
 */
export const DEFAULT_CONFIG: SumatConfig = {
    agent: {
        model: 'anthropic/claude-sonnet-4-20250514',
        maxTokens: 8192,
        temperature: 0.7,
        maxTurns: 25,
        compactionThreshold: 100000,
        providerPriority: ['anthropic', 'openai', 'openrouter', 'gemini', 'glm', 'minimax', 'ollama'],
    },

    providers: {},

    channels: {},

    gateway: {
        host: '127.0.0.1',
        port: 18789,
        auth: {
            mode: 'pairing',
        },
    },

    automation: {
        heartbeat: {
            enabled: true,
            intervalMinutes: 30,
        },
        cron: {
            enabled: true,
        },
        browser: {
            enabled: false,
            headless: true,
        },
    },

    security: {
        sandbox: {
            enabled: true,
            restrictToWorkspace: true,
            dockerMode: false,
        },
        approvalGates: {
            enabled: true,
            defaultLevel: 'supervised',
        },
        blocklist: [
            'rm -rf /', 'rm -rf ~', 'mkfs', 'dd if=', 'format', 'diskpart',
            'shutdown', 'reboot', 'poweroff', ':(){ :|:& };:',
            'del /f /s /q', 'rmdir /s /q',
        ],
        pairingEnabled: true,
    },

    skills: {
        enabled: true,
        directories: [],
        autoLoad: true,
    },

    workspace: '~/.sumat/workspace',
    logLevel: 'info',
};
