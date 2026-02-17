import dotenv from 'dotenv';
import { loadConfig, ensureWorkspace } from './config/index.js';
import { startConfigWatcher, stopConfigWatcher } from './config/watcher.js';
import { logger } from './utils/logger.js';
import { getAgent } from './core/agent.js';
import { getToolRegistry } from './tools/registry.js';
import { registerBuiltinTools } from './tools/builtin/index.js';
import { getSkillLoader } from './skills/loader.js';
import { getRulesEngine } from './core/rules.js';
import { getAgentRouter } from './core/router.js';
import { getTelegramChannel } from './channels/telegram.js';
import { getGatewayServer } from './gateway/server.js';
import { getCronScheduler } from './automation/cron.js';
import { bus } from './bus/index.js';
import { closeDb } from './utils/db.js';
import { generateId } from './utils/crypto.js';
import type { IncomingMessage } from './types.js';

// Load environment variables
dotenv.config();

/**
 * Bootstrap and start all Sumat services
 */
export async function bootstrap(): Promise<void> {
    logger.info('🚀 Sumat AI Agent Framework starting...');

    // 1. Load config
    const config = loadConfig();
    logger.info(`Config loaded. Log level: ${config.logLevel}`);

    // 2. Initialize workspace
    const wsPath = ensureWorkspace();
    logger.info(`Workspace: ${wsPath}`);

    // 3. Register built-in tools
    const toolRegistry = getToolRegistry();
    registerBuiltinTools(toolRegistry);

    // 4. Load skills
    const skillLoader = getSkillLoader();
    const skills = skillLoader.loadAll();
    const agent = getAgent();
    agent.setSkills(skills);

    // 4b. Start rules engine watcher
    const rules = getRulesEngine();
    rules.startWatching();

    // 4c. Start config file watcher (hot-reload)
    startConfigWatcher();

    // 4d. Initialize agent router (team collaboration)
    const router = getAgentRouter();
    bus.on('config:reloaded', () => router.reload());

    // 5. Wire up incoming messages to agent
    bus.on('message:incoming', async (incoming) => {
        // Handle special commands
        if (incoming.text === '/reset') {
            const { getSessionManager } = await import('./core/session.js');
            const session = getSessionManager().getOrCreate(incoming.channelName, incoming.chatId, incoming.userId);
            getSessionManager().clearMessages(session);
            return;
        }

        if (incoming.text === '/status') {
            const { getFailoverManager } = await import('./providers/failover.js');
            const status = await getFailoverManager().getStatus();
            const statusText = status.map(s =>
                `${s.available ? '🟢' : '🔴'} ${s.name}: ${s.model} ${s.healthy ? '' : '(unhealthy)'}`
            ).join('\n');
            bus.emit('message:outgoing', {
                channelName: incoming.channelName,
                chatId: incoming.chatId,
                text: `📊 *Provider Status*\n\n${statusText}`,
            });
            return;
        }

        // Process with agent
        try {
            let responseText = '';
            const stream = agent.processMessage(incoming);

            for await (const chunk of stream) {
                if (chunk.type === 'text' && chunk.text) {
                    responseText += chunk.text;
                }
            }

            // Send response back to the channel
            if (responseText) {
                bus.emit('message:outgoing', {
                    channelName: incoming.channelName,
                    chatId: incoming.chatId,
                    text: responseText,
                });
            }
        } catch (err: any) {
            logger.error('Error processing message', { error: err.message, stack: err.stack });
            bus.emit('message:outgoing', {
                channelName: incoming.channelName,
                chatId: incoming.chatId,
                text: `❌ Error: ${err.message}`,
            });
        }
    });

    // 6. Wire up cron triggers to agent
    // 6. Wire up cron triggers to agent
    bus.on('cron:trigger', async (data) => {
        logger.info(`Cron triggered: ${data.jobId}`);

        if (data.channelName && data.chatId) {
            // Proactive message to user
            const incoming: IncomingMessage = {
                id: generateId(),
                channelName: data.channelName,
                chatId: data.chatId,
                userId: data.userId || 'system-cron',
                text: `[System Trigger] ${data.message}`,
                timestamp: new Date(),
                isGroup: false
            };
            // Inject into message stream
            bus.emit('message:incoming', incoming);
        } else {
            // Legacy/Internal behavior
            try {
                const response = await agent.prompt(data.message);
                logger.info(`Cron response: ${response.slice(0, 100)}...`);
            } catch (err: any) {
                logger.error('Cron execution error', { error: err.message });
            }
        }
    });

    // 7. Wire up heartbeat to agent
    bus.on('heartbeat:tick', async (data) => {
        const { getContextBuilder } = await import('./core/context.js');
        const prompt = getContextBuilder().buildHeartbeatPrompt();
        try {
            const response = await agent.prompt(
                `[Heartbeat ${data.timestamp.toISOString()}] ${prompt}`
            );
            if (response && response.trim()) {
                logger.info(`Heartbeat response: ${response.slice(0, 200)}`);
            }
        } catch (err: any) {
            logger.error('Heartbeat error', { error: err.message });
        }
    });

    // 8. Start Gateway server
    const gateway = getGatewayServer();
    await gateway.start();

    // 9. Start Telegram channel
    const telegram = getTelegramChannel();
    await telegram.start();

    // 10. Start cron scheduler
    const scheduler = getCronScheduler();
    scheduler.start();

    logger.info('✅ Sumat is ready!');

    // Graceful shutdown
    const shutdown = async () => {
        logger.info('Shutting down...');
        stopConfigWatcher();
        rules.stopWatching();
        scheduler.stop();
        await telegram.stop();
        await gateway.stop();
        closeDb();
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

// Run if executed directly
const isMainModule = process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js');
if (isMainModule && !process.argv.includes('--no-auto-start')) {
    bootstrap().catch(err => {
        logger.error('Fatal startup error', { error: err.message, stack: err.stack });
        process.exit(1);
    });
}
