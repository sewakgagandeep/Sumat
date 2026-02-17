import { getDb } from '../utils/db.js';
import { logger } from '../utils/logger.js';

export interface UsageRecord {
    provider: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    sessionId: string;
    timestamp: string;
}

export interface UsageSummary {
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalTokens: number;
    requestCount: number;
    byProvider: Record<string, { tokens: number; requests: number }>;
    byModel: Record<string, { tokens: number; requests: number }>;
}

/**
 * UsageTracker — logs LLM token usage to SQLite for analytics.
 * Uses the pre-existing `usage` table from the schema.
 */
export class UsageTracker {
    /**
     * Track a single LLM request's token usage.
     */
    track(
        provider: string,
        model: string,
        promptTokens: number,
        completionTokens: number,
        sessionId: string
    ): void {
        const db = getDb();
        try {
            db.prepare(`
                INSERT INTO usage (provider, model, prompt_tokens, completion_tokens, total_tokens, session_id)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(
                provider,
                model,
                promptTokens,
                completionTokens,
                promptTokens + completionTokens,
                sessionId
            );
        } catch (err: any) {
            logger.warn('Failed to track usage', { error: err.message });
        }
    }

    /**
     * Get usage summary for a given number of days.
     */
    getSummary(days: number = 7): UsageSummary {
        const db = getDb();
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

        const rows = db.prepare(`
            SELECT provider, model,
                   SUM(prompt_tokens) as prompt_tokens,
                   SUM(completion_tokens) as completion_tokens,
                   SUM(total_tokens) as total_tokens,
                   COUNT(*) as request_count
            FROM usage
            WHERE created_at >= ?
            GROUP BY provider, model
            ORDER BY total_tokens DESC
        `).all(since) as any[];

        const summary: UsageSummary = {
            totalPromptTokens: 0,
            totalCompletionTokens: 0,
            totalTokens: 0,
            requestCount: 0,
            byProvider: {},
            byModel: {},
        };

        for (const row of rows) {
            summary.totalPromptTokens += row.prompt_tokens;
            summary.totalCompletionTokens += row.completion_tokens;
            summary.totalTokens += row.total_tokens;
            summary.requestCount += row.request_count;

            if (!summary.byProvider[row.provider]) {
                summary.byProvider[row.provider] = { tokens: 0, requests: 0 };
            }
            summary.byProvider[row.provider].tokens += row.total_tokens;
            summary.byProvider[row.provider].requests += row.request_count;

            const modelKey = `${row.provider}/${row.model}`;
            if (!summary.byModel[modelKey]) {
                summary.byModel[modelKey] = { tokens: 0, requests: 0 };
            }
            summary.byModel[modelKey].tokens += row.total_tokens;
            summary.byModel[modelKey].requests += row.request_count;
        }

        return summary;
    }

    /**
     * Get daily usage for the last N days.
     */
    getDailyUsage(days: number = 7): Array<{ date: string; tokens: number; requests: number }> {
        const db = getDb();
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

        const rows = db.prepare(`
            SELECT date(created_at) as date,
                   SUM(total_tokens) as tokens,
                   COUNT(*) as requests
            FROM usage
            WHERE created_at >= ?
            GROUP BY date(created_at)
            ORDER BY date DESC
        `).all(since) as any[];

        return rows.map(r => ({ date: r.date, tokens: r.tokens, requests: r.requests }));
    }
}

// Singleton
let usageInstance: UsageTracker | null = null;

export function getUsageTracker(): UsageTracker {
    if (!usageInstance) {
        usageInstance = new UsageTracker();
    }
    return usageInstance;
}
