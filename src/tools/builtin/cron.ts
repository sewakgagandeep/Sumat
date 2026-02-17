import { getCronScheduler } from '../../automation/cron.js';
import type { ToolDefinition, ToolResult } from '../../types.js';

export const cronAddTool: ToolDefinition = {
    name: 'cron_add',
    description: 'Schedule a task to run periodically using a cron expression. The task will send a message to the agent at the specified time.',
    parameters: {
        type: 'object',
        properties: {
            name: { type: 'string', description: 'Unique name for the job' },
            schedule: { type: 'string', description: 'Cron expression (e.g. "0 9 * * *" for daily at 9am)' },
            message: { type: 'string', description: 'Message/instruction to send to the agent when triggered' },
        },
        required: ['name', 'schedule', 'message'],
    },
    approvalLevel: 'supervised',

    async execute(args, context): Promise<ToolResult> {
        const scheduler = getCronScheduler();
        try {
            const job = scheduler.addJob({
                name: args.name as string,
                schedule: args.schedule as string,
                message: args.message as string,
                channelName: context.channelName,
                chatId: context.sessionId, // Using sessionId as chatId for context
                userId: context.userId,
                enabled: true,
            });
            return {
                toolCallId: context.sessionId,
                content: `Scheduled job "${job.name}" with ID ${job.id} to run at "${job.schedule}".`,
            };
        } catch (err: any) {
            return { toolCallId: context.sessionId, content: `Failed to schedule job: ${err.message}`, isError: true };
        }
    },
};

export const cronListTool: ToolDefinition = {
    name: 'cron_list',
    description: 'List all scheduled cron jobs.',
    parameters: {
        type: 'object',
        properties: {},
    },
    approvalLevel: 'read',

    async execute(_args, context): Promise<ToolResult> {
        const scheduler = getCronScheduler();
        const jobs = scheduler.listJobs();
        if (jobs.length === 0) {
            return { toolCallId: context.sessionId, content: 'No scheduled jobs.' };
        }
        const list = jobs.map(j =>
            `- [${j.id}] ${j.name} (${j.schedule}): "${j.message}" (Enabled: ${j.enabled})`
        ).join('\n');
        return { toolCallId: context.sessionId, content: `Scheduled jobs:\n${list}` };
    },
};

export const cronRemoveTool: ToolDefinition = {
    name: 'cron_remove',
    description: 'Remove a scheduled cron job by ID.',
    parameters: {
        type: 'object',
        properties: {
            id: { type: 'string', description: 'Job ID to remove' },
        },
        required: ['id'],
    },
    approvalLevel: 'supervised',

    async execute(args, context): Promise<ToolResult> {
        const scheduler = getCronScheduler();
        try {
            scheduler.removeJob(args.id as string);
            return { toolCallId: context.sessionId, content: `Removed job ${args.id}.` };
        } catch (err: any) {
            return { toolCallId: context.sessionId, content: `Failed to remove job: ${err.message}`, isError: true };
        }
    },
};
