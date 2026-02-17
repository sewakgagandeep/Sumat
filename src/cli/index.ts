#!/usr/bin/env node
import { Command } from 'commander';
import dotenv from 'dotenv';

dotenv.config();

const program = new Command();

program
    .name('sumat')
    .description('Sumat — Personal AI Agent Framework')
    .version('0.1.0');

// =====================================
// sumat start — start all services
// =====================================
program
    .command('start')
    .alias('up')
    .description('Start all Sumat services (gateway, channels, cron)')
    .action(async () => {
        const { bootstrap } = await import('../index.js');
        await bootstrap();
    });

// =====================================
// sumat gateway — start only the gateway
// =====================================
program
    .command('gateway')
    .description('Start only the Gateway WebSocket server')
    .action(async () => {
        const { loadConfig } = await import('../config/index.js');
        const { getGatewayServer } = await import('../gateway/server.js');
        const { logger } = await import('../utils/logger.js');
        loadConfig();
        const gw = getGatewayServer();
        await gw.start();
        logger.info('Gateway-only mode. Press Ctrl+C to stop.');
    });

// =====================================
// sumat agent <message> — one-shot agent chat
// =====================================
program
    .command('agent')
    .argument('<message...>', 'Message to send to the agent')
    .description('Send a one-shot message to the agent')
    .action(async (messageParts: string[]) => {
        const { loadConfig, ensureWorkspace } = await import('../config/index.js');
        const { getAgent } = await import('../core/agent.js');
        const { getToolRegistry } = await import('../tools/registry.js');
        const { registerBuiltinTools } = await import('../tools/builtin/index.js');
        const { getSkillLoader } = await import('../skills/loader.js');
        const { getFailoverManager } = await import('../providers/failover.js');

        loadConfig();
        ensureWorkspace();
        registerBuiltinTools(getToolRegistry());
        const skills = getSkillLoader().loadAll();
        const agent = getAgent();
        agent.setSkills(skills);

        const message = messageParts.join(' ');
        console.log(`\n💬 You: ${message}\n`);

        const incoming = {
            id: `cli_${Date.now()}`,
            channelName: 'cli',
            chatId: 'cli',
            userId: 'cli',
            text: message,
            isGroup: false,
            timestamp: new Date(),
        };

        let response = '';
        const stream = agent.processMessage(incoming);
        for await (const chunk of stream) {
            if (chunk.type === 'text' && chunk.text) {
                process.stdout.write(chunk.text);
                response += chunk.text;
            }
        }
        console.log('\n');
        process.exit(0);
    });

// =====================================
// sumat onboard — interactive setup
// =====================================
program
    .command('onboard')
    .description('Configure Sumat interactively')
    .action(async () => {
        const { loadConfig, saveConfig, ensureWorkspace, CONFIG_PATH } = await import('../config/index.js');
        const readline = await import('readline');

        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const ask = (q: string): Promise<string> => new Promise(r => rl.question(q, r));

        console.log('\n🤖 Welcome to Sumat setup!\n');

        const anthropicKey = await ask('Anthropic API key (leave blank to skip): ');
        const openaiKey = await ask('OpenAI API key (leave blank to skip): ');
        const openrouterKey = await ask('OpenRouter API key (leave blank to skip): ');
        const geminiKey = await ask('Gemini API key (leave blank to skip): ');
        const glmKey = await ask('GLM (z.ai) API key (leave blank to skip): ');
        const minimaxKey = await ask('MiniMax API key (leave blank to skip): ');
        const telegramToken = await ask('Telegram Bot token (leave blank to skip): ');

        const config: Record<string, any> = { providers: {}, channels: {} };

        if (anthropicKey) config.providers.anthropic = { apiKey: anthropicKey };
        if (openaiKey) config.providers.openai = { apiKey: openaiKey };
        if (openrouterKey) config.providers.openrouter = { apiKey: openrouterKey };
        if (geminiKey) config.providers.gemini = { apiKey: geminiKey };
        if (glmKey) config.providers.glm = { apiKey: glmKey };
        if (minimaxKey) config.providers.minimax = { apiKey: minimaxKey };
        if (telegramToken) config.channels.telegram = { botToken: telegramToken };

        saveConfig(config);
        ensureWorkspace();

        console.log(`\n✅ Config saved to ${CONFIG_PATH}`);
        console.log('Run "sumat start" to launch your agent!\n');
        rl.close();
        process.exit(0);
    });

// =====================================
// sumat status — show system status
// =====================================
program
    .command('status')
    .description('Show current system status')
    .action(async () => {
        const { loadConfig } = await import('../config/index.js');
        const { getFailoverManager } = await import('../providers/failover.js');
        const { getSessionManager } = await import('../core/session.js');
        const { getCronScheduler } = await import('../automation/cron.js');

        loadConfig();

        console.log('\n📊 Sumat Status\n');

        // Provider status
        const failover = getFailoverManager();
        const providers = await failover.getStatus();
        console.log('LLM Providers:');
        for (const p of providers) {
            const icon = p.available ? (p.healthy ? '🟢' : '🟡') : '🔴';
            console.log(`  ${icon} ${p.name}: ${p.model}`);
        }

        // Sessions
        const sessions = getSessionManager().listSessions();
        console.log(`\nSessions: ${sessions.length}`);

        // Cron
        const jobs = getCronScheduler().listJobs();
        console.log(`Cron jobs: ${jobs.length} (${jobs.filter(j => j.enabled).length} enabled)`);

        console.log('');
        process.exit(0);
    });

// =====================================
// sumat doctor — diagnose issues
// =====================================
program
    .command('doctor')
    .description('Diagnose common issues')
    .action(async () => {
        const { loadConfig, getWorkspacePath } = await import('../config/index.js');
        const { getFailoverManager } = await import('../providers/failover.js');
        const fs = await import('fs');

        loadConfig();

        console.log('\n🩺 Sumat Doctor\n');
        let issues = 0;

        // Check workspace
        const wsPath = getWorkspacePath();
        if (fs.existsSync(wsPath)) {
            console.log('✅ Workspace exists:', wsPath);
        } else {
            console.log('❌ Workspace missing:', wsPath);
            issues++;
        }

        // Check providers
        const failover = getFailoverManager();
        const available = await failover.getAvailableProviders();
        if (available.length > 0) {
            console.log(`✅ ${available.length} provider(s) configured:`, available.map(p => p.name).join(', '));
        } else {
            console.log('❌ No LLM providers configured! Run "sumat onboard" to set up.');
            issues++;
        }

        // Check Node version
        const nodeVersion = parseInt(process.versions.node.split('.')[0]);
        if (nodeVersion >= 20) {
            console.log(`✅ Node.js ${process.versions.node}`);
        } else {
            console.log(`❌ Node.js ${process.versions.node} (need >= 20.0.0)`);
            issues++;
        }

        if (issues === 0) {
            console.log('\n🎉 No issues found!');
        } else {
            console.log(`\n⚠️  ${issues} issue(s) found.`);
        }
        console.log('');
        process.exit(issues > 0 ? 1 : 0);
    });

// =====================================
// sumat cron — manage cron jobs
// =====================================
const cronCmd = program
    .command('cron')
    .description('Manage scheduled jobs');

cronCmd
    .command('list')
    .description('List all cron jobs')
    .action(async () => {
        const { loadConfig } = await import('../config/index.js');
        const { getCronScheduler } = await import('../automation/cron.js');

        loadConfig();
        const jobs = getCronScheduler().listJobs();

        if (jobs.length === 0) {
            console.log('No cron jobs configured.');
            process.exit(0);
        }

        console.log('\n⏰ Cron Jobs:\n');
        for (const job of jobs) {
            const status = job.enabled ? '🟢' : '🔴';
            console.log(`  ${status} ${job.name} [${job.schedule}]`);
            console.log(`     Message: ${job.message.slice(0, 60)}...`);
            console.log(`     Last run: ${job.lastRun || 'never'}`);
            console.log(`     ID: ${job.id}\n`);
        }
        process.exit(0);
    });

cronCmd
    .command('add')
    .argument('<name>', 'Job name')
    .argument('<schedule>', 'Cron expression (e.g., "0 9 * * *")')
    .argument('<message...>', 'Message to send')
    .description('Add a new cron job')
    .action(async (name: string, schedule: string, messageParts: string[]) => {
        const { loadConfig } = await import('../config/index.js');
        const { getCronScheduler } = await import('../automation/cron.js');

        loadConfig();
        const scheduler = getCronScheduler();

        try {
            const job = scheduler.addJob({
                name,
                schedule,
                message: messageParts.join(' '),
                enabled: true,
            });
            console.log(`✅ Job added: ${job.name} (${job.id})`);
        } catch (err: any) {
            console.error(`❌ Error: ${err.message}`);
        }
        process.exit(0);
    });

cronCmd
    .command('remove')
    .argument('<id>', 'Job ID')
    .description('Remove a cron job')
    .action(async (id: string) => {
        const { loadConfig } = await import('../config/index.js');
        const { getCronScheduler } = await import('../automation/cron.js');

        loadConfig();
        getCronScheduler().removeJob(id);
        console.log(`✅ Job removed: ${id}`);
        process.exit(0);
    });

// =====================================
// sumat pairing — manage pairing codes
// =====================================
const pairingCmd = program
    .command('pairing')
    .description('Manage pairing codes for gateway authentication');

pairingCmd
    .command('generate')
    .option('-u, --user <userId>', 'Associate with a user ID')
    .option('-c, --channel <channelName>', 'Associate with a channel')
    .description('Generate a new 6-digit pairing code')
    .action(async (opts: { user?: string; channel?: string }) => {
        const { loadConfig } = await import('../config/index.js');
        const { getPairingService } = await import('../core/pairing.js');

        loadConfig();
        const code = getPairingService().generate(opts.user, opts.channel);
        console.log(`\n🔑 Pairing code: ${code}`);
        console.log('   Expires in 10 minutes.\n');
        process.exit(0);
    });

pairingCmd
    .command('validate')
    .argument('<code>', '6-digit pairing code')
    .description('Validate a pairing code and get a bearer token')
    .action(async (code: string) => {
        const { loadConfig } = await import('../config/index.js');
        const { getPairingService } = await import('../core/pairing.js');

        loadConfig();
        const result = getPairingService().validate(code);
        if (result.valid) {
            console.log(`\n✅ Code valid! Bearer token:\n   ${result.token}\n`);
        } else {
            console.log('\n❌ Invalid, expired, or already-used code.\n');
            process.exit(1);
        }
        process.exit(0);
    });

pairingCmd
    .command('list')
    .description('List active (unused, non-expired) pairing codes')
    .action(async () => {
        const { loadConfig } = await import('../config/index.js');
        const { getPairingService } = await import('../core/pairing.js');

        loadConfig();
        const codes = getPairingService().listActive();
        if (codes.length === 0) {
            console.log('No active pairing codes.');
        } else {
            console.log('\n🔑 Active Pairing Codes:\n');
            for (const c of codes) {
                console.log(`  ${c.code}  expires: ${c.expiresAt}  user: ${c.userId || '-'}  channel: ${c.channelName || '-'}`);
            }
            console.log('');
        }
        process.exit(0);
    });

// =====================================
// sumat usage — view token usage stats
// =====================================
program
    .command('usage')
    .option('-d, --days <days>', 'Number of days to show (default: 7)', '7')
    .description('Show LLM token usage analytics')
    .action(async (opts: { days: string }) => {
        const { loadConfig } = await import('../config/index.js');
        const { getUsageTracker } = await import('../core/usage.js');

        loadConfig();
        const days = parseInt(opts.days) || 7;
        const tracker = getUsageTracker();
        const summary = tracker.getSummary(days);
        const daily = tracker.getDailyUsage(days);

        console.log(`\n📊 Token Usage (last ${days} days)\n`);
        console.log(`  Total tokens:  ${summary.totalTokens.toLocaleString()}`);
        console.log(`  Prompt:        ${summary.totalPromptTokens.toLocaleString()}`);
        console.log(`  Completion:    ${summary.totalCompletionTokens.toLocaleString()}`);
        console.log(`  Requests:      ${summary.requestCount}`);

        if (Object.keys(summary.byProvider).length > 0) {
            console.log(`\n  By Provider:`);
            for (const [name, data] of Object.entries(summary.byProvider)) {
                console.log(`    ${name}: ${data.tokens.toLocaleString()} tokens (${data.requests} requests)`);
            }
        }

        if (Object.keys(summary.byModel).length > 0) {
            console.log(`\n  By Model:`);
            for (const [name, data] of Object.entries(summary.byModel)) {
                console.log(`    ${name}: ${data.tokens.toLocaleString()} tokens (${data.requests} requests)`);
            }
        }

        if (daily.length > 0) {
            console.log(`\n  Daily:`);
            for (const d of daily) {
                console.log(`    ${d.date}: ${d.tokens.toLocaleString()} tokens (${d.requests} requests)`);
            }
        }

        console.log('');
        process.exit(0);
    });

// =====================================
// sumat team — view agent team config
// =====================================
program
    .command('team')
    .description('Show configured agent team members')
    .action(async () => {
        const { loadConfig } = await import('../config/index.js');
        const { getAgentRouter } = await import('../core/router.js');

        loadConfig();
        const router = getAgentRouter();
        const team = router.getTeam();

        if (team.length === 0) {
            console.log('\nNo agent team configured. Running in single-agent mode.');
            console.log('Add "agent.team" to config.json to enable multi-agent routing.\n');
        } else {
            console.log(`\n🤖 Agent Team (${team.length} members)\n`);
            for (const member of team) {
                console.log(`  ${member.name}`);
                console.log(`    Model: ${member.model || 'default'}`);
                console.log(`    Triggers: ${member.triggerPatterns.join(', ')}`);
                console.log('');
            }
        }
        process.exit(0);
    });

program.parse();

