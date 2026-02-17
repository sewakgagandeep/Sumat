// @ts-ignore — node-cron lacks bundled types
import cron from 'node-cron';
import { getDb } from '../utils/db.js';
import { bus } from '../bus/index.js';
import { getConfig } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { generateId } from '../utils/crypto.js';

export interface CronJob {
    id: string;
    name: string;
    schedule: string;        // cron expression (e.g., "0 9 * * *")
    message: string;         // message to send to agent
    channelName?: string;    // channel to respond on
    chatId?: string;         // chat to respond on
    userId?: string;         // user context
    enabled: boolean;
    lastRun?: string;
}

/**
 * Cron Scheduler — manages scheduled tasks.
 * Jobs are stored in SQLite for persistence across restarts.
 */
export class CronScheduler {
    private tasks: Map<string, cron.ScheduledTask> = new Map();

    /**
     * Start the scheduler and load jobs from DB
     */
    start(): void {
        const config = getConfig();
        if (!config.automation.cron.enabled) {
            logger.info('Cron scheduler disabled');
            return;
        }

        // Load and start all enabled jobs
        const jobs = this.listJobs().filter(j => j.enabled);
        for (const job of jobs) {
            this.scheduleJob(job);
        }

        // Start heartbeat if enabled
        if (config.automation.heartbeat.enabled) {
            const interval = config.automation.heartbeat.intervalMinutes;
            const heartbeatSchedule = `*/${interval} * * * *`;
            const heartbeatTask = cron.schedule(heartbeatSchedule, () => {
                bus.emit('heartbeat:tick', { timestamp: new Date() });
                logger.debug('Heartbeat tick');
            });
            this.tasks.set('__heartbeat__', heartbeatTask);
            logger.info(`Heartbeat started: every ${interval} minutes`);
        }

        logger.info(`Cron scheduler started with ${jobs.length} jobs`);
    }

    /**
     * Add a new cron job
     */
    addJob(job: Omit<CronJob, 'id'>): CronJob {
        // Validate cron expression
        if (!cron.validate(job.schedule)) {
            throw new Error(`Invalid cron expression: ${job.schedule}`);
        }

        const fullJob: CronJob = { ...job, id: generateId(8) };

        const db = getDb();
        db.prepare(
            'INSERT INTO cron_jobs (id, name, schedule, message, channel_name, chat_id, user_id, enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(
            fullJob.id, fullJob.name, fullJob.schedule, fullJob.message,
            fullJob.channelName || null, fullJob.chatId || null, fullJob.userId || null,
            fullJob.enabled ? 1 : 0
        );

        if (fullJob.enabled) {
            this.scheduleJob(fullJob);
        }

        logger.info(`Cron job added: ${fullJob.name} (${fullJob.schedule})`);
        return fullJob;
    }

    /**
     * Remove a cron job
     */
    removeJob(id: string): void {
        const task = this.tasks.get(id);
        if (task) {
            task.stop();
            this.tasks.delete(id);
        }

        const db = getDb();
        db.prepare('DELETE FROM cron_jobs WHERE id = ?').run(id);
        logger.info(`Cron job removed: ${id}`);
    }

    /**
     * Enable/disable a job
     */
    toggleJob(id: string, enabled: boolean): void {
        const db = getDb();
        db.prepare('UPDATE cron_jobs SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id);

        if (enabled) {
            const job = this.getJob(id);
            if (job) this.scheduleJob(job);
        } else {
            const task = this.tasks.get(id);
            if (task) {
                task.stop();
                this.tasks.delete(id);
            }
        }
    }

    /**
     * List all jobs
     */
    listJobs(): CronJob[] {
        const db = getDb();
        const rows = db.prepare('SELECT * FROM cron_jobs ORDER BY name').all() as any[];
        return rows.map(r => ({
            id: r.id,
            name: r.name,
            schedule: r.schedule,
            message: r.message,
            channelName: r.channel_name,
            chatId: r.chat_id,
            userId: r.user_id,
            enabled: !!r.enabled,
            lastRun: r.last_run,
        }));
    }

    /**
     * Get a single job by ID
     */
    getJob(id: string): CronJob | null {
        const db = getDb();
        const row = db.prepare('SELECT * FROM cron_jobs WHERE id = ?').get(id) as any;
        if (!row) return null;
        return {
            id: row.id, name: row.name, schedule: row.schedule,
            message: row.message, channelName: row.channel_name,
            chatId: row.chat_id, userId: row.user_id,
            enabled: !!row.enabled, lastRun: row.last_run,
        };
    }

    /**
     * Schedule a job for execution
     */
    private scheduleJob(job: CronJob): void {
        // Stop existing task if any
        const existing = this.tasks.get(job.id);
        if (existing) existing.stop();

        const task = cron.schedule(job.schedule, () => {
            logger.info(`Cron job triggered: ${job.name}`);

            // Update last run
            const db = getDb();
            db.prepare('UPDATE cron_jobs SET last_run = datetime("now") WHERE id = ?').run(job.id);

            // Emit cron trigger event
            bus.emit('cron:trigger', {
                jobId: job.id,
                message: job.message,
                channelName: job.channelName,
                chatId: job.chatId,
                userId: job.userId,
            });
        });

        this.tasks.set(job.id, task);
    }

    /**
     * Stop all tasks
     */
    stop(): void {
        for (const [, task] of this.tasks) {
            task.stop();
        }
        this.tasks.clear();
        logger.info('Cron scheduler stopped');
    }
}

// Singleton
let schedulerInstance: CronScheduler | null = null;

export function getCronScheduler(): CronScheduler {
    if (!schedulerInstance) {
        schedulerInstance = new CronScheduler();
    }
    return schedulerInstance;
}
