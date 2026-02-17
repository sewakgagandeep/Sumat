import { z } from 'zod';

// ============================================
// Zod schema for Sumat configuration
// ============================================

const providerEntrySchema = z.object({
    apiKey: z.string().min(1),
    baseUrl: z.string().optional(),
    model: z.string().optional(),
});

const minimaxProviderSchema = providerEntrySchema.extend({
    groupId: z.string().optional(),
});

const ollamaProviderSchema = z.object({
    baseUrl: z.string().default('http://localhost:11434'),
    model: z.string().optional(),
});

export const configSchema = z.object({
    agent: z.object({
        model: z.string().default('anthropic/claude-sonnet-4-20250514'),
        maxTokens: z.number().int().positive().default(8192),
        temperature: z.number().min(0).max(2).default(0.7),
        maxTurns: z.number().int().positive().default(25),
        compactionThreshold: z.number().int().positive().default(100000),
        providerPriority: z.array(z.string()).default(['anthropic', 'openai', 'openrouter', 'gemini', 'glm', 'minimax', 'ollama']),
    }).default({}),

    providers: z.object({
        anthropic: providerEntrySchema.optional(),
        openai: providerEntrySchema.optional(),
        openrouter: providerEntrySchema.optional(),
        gemini: providerEntrySchema.optional(),
        glm: providerEntrySchema.optional(),
        minimax: minimaxProviderSchema.optional(),
        ollama: ollamaProviderSchema.optional(),
    }).default({}),

    channels: z.object({
        telegram: z.object({
            botToken: z.string().min(1),
            allowedUsers: z.array(z.string()).optional(),
            allowedGroups: z.array(z.string()).optional(),
        }).optional(),
        webchat: z.object({
            enabled: z.boolean().default(false),
        }).optional(),
    }).default({}),

    gateway: z.object({
        host: z.string().default('127.0.0.1'),
        port: z.number().int().default(18789),
        auth: z.object({
            mode: z.enum(['none', 'password', 'pairing']).default('pairing'),
            password: z.string().optional(),
        }).default({}),
    }).default({}),

    automation: z.object({
        heartbeat: z.object({
            enabled: z.boolean().default(true),
            intervalMinutes: z.number().int().positive().default(30),
        }).default({}),
        cron: z.object({
            enabled: z.boolean().default(true),
        }).default({}),
        browser: z.object({
            enabled: z.boolean().default(false),
            headless: z.boolean().default(true),
        }).default({}),
    }).default({}),

    security: z.object({
        sandbox: z.object({
            enabled: z.boolean().default(true),
            restrictToWorkspace: z.boolean().default(true),
            dockerMode: z.boolean().default(false),
        }).default({}),
        approvalGates: z.object({
            enabled: z.boolean().default(true),
            defaultLevel: z.enum(['read', 'supervised', 'autonomous']).default('supervised'),
        }).default({}),
        blocklist: z.array(z.string()).default([
            'rm -rf /', 'rm -rf ~', 'mkfs', 'dd if=', 'format', 'diskpart',
            'shutdown', 'reboot', 'poweroff', ':(){ :|:& };:',
            'del /f /s /q', 'rmdir /s /q',
        ]),
        pairingEnabled: z.boolean().default(true),
    }).default({}),

    skills: z.object({
        enabled: z.boolean().default(true),
        directories: z.array(z.string()).default([]),
        autoLoad: z.boolean().default(true),
    }).default({}),

    workspace: z.string().default('~/.sumat/workspace'),
    logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type ValidatedConfig = z.infer<typeof configSchema>;
