import fs from 'fs';
import path from 'path';
import os from 'os';
import { configSchema, type ValidatedConfig } from './schema.js';
import { DEFAULT_CONFIG } from './defaults.js';
import { logger, setLogLevel } from '../utils/logger.js';
import type { SumatConfig } from '../types.js';

const CONFIG_DIR = path.join(os.homedir(), '.sumat');
const CONFIG_PATH = process.env.SUMAT_CONFIG_PATH
    ? path.resolve(process.env.SUMAT_CONFIG_PATH)
    : path.join(CONFIG_DIR, 'config.json');

let currentConfig: SumatConfig | null = null;

/**
 * Load configuration from file + environment variables.
 * Merges: defaults → config.json → env vars
 */
export function loadConfig(): SumatConfig {
    // Start with defaults
    let fileConfig: Record<string, unknown> = {};

    // Read config file if it exists
    if (fs.existsSync(CONFIG_PATH)) {
        try {
            const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
            fileConfig = JSON.parse(raw);
            logger.debug('Config loaded from file', { path: CONFIG_PATH });
        } catch (err) {
            logger.warn('Failed to parse config file, using defaults', { path: CONFIG_PATH, error: err });
        }
    } else {
        logger.info('No config file found, using defaults. Run "sumat onboard" to configure.', { path: CONFIG_PATH });
    }

    // Apply environment variable overrides
    const envOverrides = getEnvOverrides();
    const merged = deepMerge(deepMerge({}, fileConfig), envOverrides);

    // Validate with Zod
    const result = configSchema.safeParse(merged);

    if (!result.success) {
        logger.warn('Config validation issues, applying defaults where needed', {
            issues: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
        });
        // Parse with defaults applied
        currentConfig = configSchema.parse(merged) as unknown as SumatConfig;
    } else {
        currentConfig = result.data as unknown as SumatConfig;
    }

    // Set log level from config
    setLogLevel(currentConfig.logLevel);

    return currentConfig;
}

/**
 * Get the current config (loads if not already loaded)
 */
export function getConfig(): SumatConfig {
    if (!currentConfig) {
        return loadConfig();
    }
    return currentConfig;
}

/**
 * Save configuration to file
 */
export function saveConfig(config: Partial<SumatConfig>): void {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }

    // Merge with existing config
    const existing = fs.existsSync(CONFIG_PATH)
        ? JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
        : {};
    const merged = deepMerge(existing, config);

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2), 'utf-8');
    logger.info('Config saved', { path: CONFIG_PATH });

    // Reload
    currentConfig = null;
    loadConfig();
}

/**
 * Get the resolved workspace path (~ expanded)
 */
export function getWorkspacePath(): string {
    const config = getConfig();
    const ws = config.workspace || DEFAULT_CONFIG.workspace;
    if (ws.startsWith('~')) {
        return path.join(os.homedir(), ws.slice(1));
    }
    return path.resolve(ws);
}

/**
 * Ensure the workspace directory and default files exist
 */
export function ensureWorkspace(): string {
    const wsPath = getWorkspacePath();

    const dirs = ['sessions', 'memory', 'state', 'cron', 'skills'];
    for (const dir of dirs) {
        const dirPath = path.join(wsPath, dir);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    }

    // Create default workspace files if they don't exist
    const defaults: Record<string, string> = {
        'SOUL.md': `# Soul\n\nYou are Sumat, a helpful personal AI assistant. You are direct, capable, and proactive.\nYou help your user with day-to-day tasks, automation, coding, research, and anything they need.\nYou have a can-do attitude and you always find a way to accomplish what's asked.\n`,
        'IDENTITY.md': `# Identity\n\n- **Name**: Sumat\n- **Role**: Personal AI Assistant\n- **Created by**: Custom framework\n`,
        'AGENTS.md': `# Agent Behavior Rules\n\n1. Always be helpful and complete tasks thoroughly\n2. Ask for clarification when requirements are ambiguous\n3. Use tools when they would be more effective than text responses\n4. Report progress on long-running tasks\n5. Respect security boundaries and approval gates\n`,
        'TOOLS.md': `# Available Tools\n\nTools are dynamically loaded. Use the tools provided in your context to accomplish tasks.\n`,
        'HEARTBEAT.md': `# Heartbeat Tasks\n\nThese tasks are checked periodically (default: every 30 minutes).\n\n- Check for pending scheduled tasks\n- Review any unread messages or notifications\n`,
        'USER.md': `# User Preferences\n\n- Communication style: concise and direct\n- Preferred language: English\n`,
    };

    for (const [file, content] of Object.entries(defaults)) {
        const filePath = path.join(wsPath, file);
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, content, 'utf-8');
        }
    }

    logger.info('Workspace ready', { path: wsPath });
    return wsPath;
}

/**
 * Extract environment variable overrides with SUMAT_ prefix
 * e.g. SUMAT_PROVIDERS_ANTHROPIC_APIKEY → providers.anthropic.apiKey
 */
function getEnvOverrides(): Record<string, unknown> {
    const overrides: Record<string, unknown> = {};

    // Direct mappings for common env vars
    const directMappings: Record<string, string[]> = {
        'ANTHROPIC_API_KEY': ['providers', 'anthropic', 'apiKey'],
        'OPENAI_API_KEY': ['providers', 'openai', 'apiKey'],
        'OPENROUTER_API_KEY': ['providers', 'openrouter', 'apiKey'],
        'GEMINI_API_KEY': ['providers', 'gemini', 'apiKey'],
        'GLM_API_KEY': ['providers', 'glm', 'apiKey'],
        'MINIMAX_API_KEY': ['providers', 'minimax', 'apiKey'],
        'MINIMAX_GROUP_ID': ['providers', 'minimax', 'groupId'],
        'OLLAMA_BASE_URL': ['providers', 'ollama', 'baseUrl'],
        'TELEGRAM_BOT_TOKEN': ['channels', 'telegram', 'botToken'],
        'SUMAT_GATEWAY_PORT': ['gateway', 'port'],
        'SUMAT_GATEWAY_HOST': ['gateway', 'host'],
        'SUMAT_LOG_LEVEL': ['logLevel'],
        'SUMAT_WORKSPACE_PATH': ['workspace'],
    };

    for (const [envKey, configPath] of Object.entries(directMappings)) {
        const value = process.env[envKey];
        if (value !== undefined && value.trim() !== '') {
            setNestedValue(overrides, configPath, coerceValue(value));
        }
    }

    return overrides;
}

function setNestedValue(obj: Record<string, unknown>, path: string[], value: unknown): void {
    let current: Record<string, unknown> = obj;
    for (let i = 0; i < path.length - 1; i++) {
        if (!(path[i] in current) || typeof current[path[i]] !== 'object') {
            current[path[i]] = {};
        }
        current = current[path[i]] as Record<string, unknown>;
    }
    current[path[path.length - 1]] = value;
}

function coerceValue(value: string): unknown {
    if (value === 'true') return true;
    if (value === 'false') return false;
    const num = Number(value);
    if (!isNaN(num) && value.trim() !== '') return num;
    return value;
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
    const result = { ...target };
    for (const key of Object.keys(source)) {
        if (
            source[key] !== null &&
            typeof source[key] === 'object' &&
            !Array.isArray(source[key]) &&
            typeof result[key] === 'object' &&
            result[key] !== null &&
            !Array.isArray(result[key])
        ) {
            result[key] = deepMerge(
                result[key] as Record<string, unknown>,
                source[key] as Record<string, unknown>
            );
        } else {
            result[key] = source[key];
        }
    }
    return result;
}

export { CONFIG_PATH, CONFIG_DIR };
