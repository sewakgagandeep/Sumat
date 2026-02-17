import { Bot, type Context } from 'grammy';
import type { IncomingMessage, OutgoingMessage, MediaAttachment } from '../types.js';
import { getConfig } from '../config/index.js';
import { bus } from '../bus/index.js';
import { logger } from '../utils/logger.js';

/**
 * Telegram Bot channel — uses grammY library.
 * Handles text, media, commands, and inline button callbacks (for approvals).
 */
export class TelegramChannel {
    private bot: Bot | null = null;
    private isRunning = false;

    async start(): Promise<void> {
        const config = getConfig();
        const telegramConfig = config.channels.telegram;

        if (!telegramConfig?.botToken) {
            logger.info('Telegram channel not configured, skipping');
            return;
        }

        this.bot = new Bot(telegramConfig.botToken);

        // Set up commands
        await this.bot.api.setMyCommands([
            { command: 'start', description: 'Start interacting with Sumat' },
            { command: 'reset', description: 'Reset conversation context' },
            { command: 'status', description: 'Show agent status' },
            { command: 'help', description: 'Show available commands' },
        ]);

        // Handle text messages
        this.bot.on('message:text', async (ctx) => {
            // Check allowed users
            if (telegramConfig.allowedUsers && telegramConfig.allowedUsers.length > 0) {
                const userId = ctx.from?.id?.toString() || '';
                const username = ctx.from?.username || '';
                const allowed = telegramConfig.allowedUsers.some(u =>
                    u === userId || u === username || u === `@${username}`
                );
                if (!allowed) {
                    await ctx.reply('⛔ You are not authorized to use this bot.');
                    return;
                }
            }

            const incoming: IncomingMessage = {
                id: ctx.message.message_id.toString(),
                channelName: 'telegram',
                chatId: ctx.chat.id.toString(),
                userId: ctx.from?.id?.toString() || 'unknown',
                userName: ctx.from?.username || ctx.from?.first_name || 'User',
                text: ctx.message.text,
                isGroup: ctx.chat.type !== 'private',
                groupName: ctx.chat.type !== 'private' ? (ctx.chat as any).title : undefined,
                timestamp: new Date(ctx.message.date * 1000),
            };

            bus.emit('message:incoming', incoming);
        });

        // Handle commands
        this.bot.command('start', async (ctx) => {
            await ctx.reply('👋 Hello! I\'m Sumat, your personal AI assistant. How can I help you today?');
        });

        this.bot.command('reset', async (ctx) => {
            // Reset session via bus event
            bus.emit('message:incoming', {
                id: ctx.message!.message_id.toString(),
                channelName: 'telegram',
                chatId: ctx.chat.id.toString(),
                userId: ctx.from?.id?.toString() || 'unknown',
                text: '/reset',
                isGroup: false,
                timestamp: new Date(),
            });
            await ctx.reply('🔄 Conversation reset.');
        });

        this.bot.command('status', async (ctx) => {
            bus.emit('message:incoming', {
                id: ctx.message!.message_id.toString(),
                channelName: 'telegram',
                chatId: ctx.chat.id.toString(),
                userId: ctx.from?.id?.toString() || 'unknown',
                text: '/status',
                isGroup: false,
                timestamp: new Date(),
            });
        });

        this.bot.command('help', async (ctx) => {
            await ctx.reply(
                '🤖 *Sumat Commands:*\n\n' +
                '/start — Start interacting\n' +
                '/reset — Reset conversation\n' +
                '/status — Show agent status\n' +
                '/help — Show this message\n\n' +
                'Just type your message to chat!',
                { parse_mode: 'Markdown' }
            );
        });

        // Handle approval button callbacks
        this.bot.on('callback_query:data', async (ctx) => {
            const data = ctx.callbackQuery.data;
            if (data.startsWith('approve:') || data.startsWith('deny:')) {
                const approved = data.startsWith('approve:');
                const approvalId = data.split(':')[1];
                bus.emit('approval:response', { id: approvalId, approved });
                await ctx.answerCallbackQuery({
                    text: approved ? '✅ Approved' : '❌ Denied',
                });
                // Edit message to show result
                await ctx.editMessageText(
                    `${approved ? '✅ Approved' : '❌ Denied'}: ${ctx.callbackQuery.message?.text || ''}`,
                );
            }
        });

        // Listen for outgoing messages to send via Telegram
        bus.on('message:outgoing', async (data) => {
            if (data.channelName !== 'telegram' || !this.bot) return;

            try {
                if (data.text) {
                    await this.bot.api.sendMessage(data.chatId, data.text, {
                        parse_mode: data.parseMode || 'Markdown',
                    });
                }
            } catch (err: any) {
                logger.error('Error sending Telegram message', { error: err.message });
                // Retry without parse mode
                try {
                    if (data.text) {
                        await this.bot.api.sendMessage(data.chatId, data.text);
                    }
                } catch {
                    // give up
                }
            }
        });

        // Listen for approval requests to show inline buttons
        bus.on('approval:request', async (data) => {
            // Find the chat to send the approval to (use the session's chat)
            // For now, send to all active telegram chats
            // In production, you'd look up the session's chatId
            const text = `🔒 *Approval Required*\n\n${data.description}`;
            // This will be sent by the agent via the outgoing message handler
        });

        // Handle errors
        this.bot.catch((err) => {
            logger.error('Telegram bot error', { error: err.message });
        });

        // Start polling
        this.bot.start({
            onStart: () => {
                this.isRunning = true;
                logger.info('Telegram channel started');
            },
        });
    }

    async stop(): Promise<void> {
        if (this.bot && this.isRunning) {
            await this.bot.stop();
            this.isRunning = false;
            logger.info('Telegram channel stopped');
        }
    }

    /**
     * Send an approval request with inline buttons
     */
    async sendApproval(chatId: string, approvalId: string, description: string): Promise<void> {
        if (!this.bot) return;

        await this.bot.api.sendMessage(chatId, `🔒 *Approval Required*\n\n${description}`, {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [[
                    { text: '✅ Approve', callback_data: `approve:${approvalId}` },
                    { text: '❌ Deny', callback_data: `deny:${approvalId}` },
                ]],
            },
        });
    }
}

// Singleton
let telegramInstance: TelegramChannel | null = null;

export function getTelegramChannel(): TelegramChannel {
    if (!telegramInstance) {
        telegramInstance = new TelegramChannel();
    }
    return telegramInstance;
}
