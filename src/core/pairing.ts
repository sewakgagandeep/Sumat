import { getDb } from '../utils/db.js';
import { generatePairingCode, generateToken } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';

export interface PairingCode {
    code: string;
    userId: string | null;
    channelName: string | null;
    expiresAt: string;
    used: boolean;
    createdAt: string;
}

export interface PairingValidation {
    valid: boolean;
    token?: string;
    userId?: string;
    channelName?: string;
}

/**
 * PairingService — manages 6-digit pairing codes for first-time connections.
 * Codes are stored in the `pairing_codes` SQLite table (schema already exists).
 * Typical flow:
 *   1. Admin generates a code via CLI or API
 *   2. Client presents the code to authenticate
 *   3. Service validates, marks used, returns a bearer token
 */
export class PairingService {
    private readonly CODE_TTL_MINUTES = 10;

    /**
     * Generate a new 6-digit pairing code.
     * Returns the code string (e.g., "482917").
     */
    generate(userId?: string, channelName?: string): string {
        const db = getDb();
        const code = generatePairingCode();

        const expiresAt = new Date(
            Date.now() + this.CODE_TTL_MINUTES * 60 * 1000
        ).toISOString();

        db.prepare(
            'INSERT INTO pairing_codes (code, user_id, channel_name, expires_at) VALUES (?, ?, ?, ?)'
        ).run(code, userId || null, channelName || null, expiresAt);

        logger.info(`Pairing code generated: ${code} (expires ${expiresAt})`);
        return code;
    }

    /**
     * Validate a pairing code.
     * If valid: marks the code as used and returns a bearer token.
     * If invalid/expired/already used: returns { valid: false }.
     */
    validate(code: string): PairingValidation {
        const db = getDb();

        const row = db.prepare(
            'SELECT * FROM pairing_codes WHERE code = ?'
        ).get(code) as any;

        if (!row) {
            logger.warn(`Pairing code not found: ${code}`);
            return { valid: false };
        }

        if (row.used) {
            logger.warn(`Pairing code already used: ${code}`);
            return { valid: false };
        }

        const expiresAt = new Date(row.expires_at);
        if (expiresAt < new Date()) {
            logger.warn(`Pairing code expired: ${code}`);
            return { valid: false };
        }

        // Mark as used
        const token = generateToken();
        db.prepare(
            'UPDATE pairing_codes SET used = 1 WHERE code = ?'
        ).run(code);

        // Store the token for future auth checks
        this.storeToken(token, row.user_id, row.channel_name);

        logger.info(`Pairing code validated: ${code} → token issued`);
        return {
            valid: true,
            token,
            userId: row.user_id || undefined,
            channelName: row.channel_name || undefined,
        };
    }

    /**
     * Check if a bearer token is valid.
     */
    isTokenValid(token: string): boolean {
        const db = getDb();
        const row = db.prepare(
            'SELECT 1 FROM auth_tokens WHERE token = ? AND (expires_at IS NULL OR expires_at > datetime("now"))'
        ).get(token);
        return !!row;
    }

    /**
     * Remove expired pairing codes from the database.
     */
    cleanExpired(): number {
        const db = getDb();
        const result = db.prepare(
            'DELETE FROM pairing_codes WHERE expires_at < datetime("now")'
        ).run();
        if (result.changes > 0) {
            logger.debug(`Cleaned ${result.changes} expired pairing codes`);
        }
        return result.changes;
    }

    /**
     * List all active (non-expired, non-used) codes.
     */
    listActive(): PairingCode[] {
        const db = getDb();
        const rows = db.prepare(
            'SELECT * FROM pairing_codes WHERE used = 0 AND expires_at > datetime("now") ORDER BY created_at DESC'
        ).all() as any[];

        return rows.map(r => ({
            code: r.code,
            userId: r.user_id,
            channelName: r.channel_name,
            expiresAt: r.expires_at,
            used: !!r.used,
            createdAt: r.created_at,
        }));
    }

    /**
     * Store an auth token for ongoing authentication.
     */
    private storeToken(token: string, userId: string | null, channelName: string | null): void {
        const db = getDb();

        // Ensure the auth_tokens table exists
        db.exec(`
            CREATE TABLE IF NOT EXISTS auth_tokens (
                token TEXT PRIMARY KEY,
                user_id TEXT,
                channel_name TEXT,
                expires_at TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE INDEX IF NOT EXISTS idx_auth_tokens_expires ON auth_tokens(expires_at);
        `);

        // Tokens are long-lived (30 days) once issued
        const expiresAt = new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString();

        db.prepare(
            'INSERT INTO auth_tokens (token, user_id, channel_name, expires_at) VALUES (?, ?, ?, ?)'
        ).run(token, userId, channelName, expiresAt);
    }
}

// Singleton
let pairingInstance: PairingService | null = null;

export function getPairingService(): PairingService {
    if (!pairingInstance) {
        pairingInstance = new PairingService();
    }
    return pairingInstance;
}
