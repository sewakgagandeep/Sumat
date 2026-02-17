import type { Message, Session } from '../types.js';
import { getDb } from '../utils/db.js';
import { generateId } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';

/**
 * Session Manager — handles persistence and retrieval of conversation sessions.
 * Sessions map 1:1 to a (channel, chatId) pair.
 */
export class SessionManager {
    /**
     * Get or create a session for a given channel + chatId
     */
    getOrCreate(channelName: string, chatId: string, userId: string): Session {
        const db = getDb();

        const row = db.prepare(
            'SELECT * FROM sessions WHERE channel_name = ? AND chat_id = ? ORDER BY updated_at DESC LIMIT 1'
        ).get(channelName, chatId) as any;

        if (row) {
            return {
                id: row.id,
                channelName: row.channel_name,
                chatId: row.chat_id,
                userId: row.user_id,
                messages: JSON.parse(row.messages || '[]'),
                metadata: JSON.parse(row.metadata || '{}'),
                createdAt: new Date(row.created_at),
                updatedAt: new Date(row.updated_at),
            };
        }

        // Create new session
        const session: Session = {
            id: generateId(),
            channelName,
            chatId,
            userId,
            messages: [],
            metadata: {},
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        db.prepare(
            'INSERT INTO sessions (id, channel_name, chat_id, user_id, messages, metadata) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(session.id, channelName, chatId, userId, '[]', '{}');

        logger.debug(`Session created: ${session.id}`);
        return session;
    }

    /**
     * Save session messages
     */
    save(session: Session): void {
        const db = getDb();
        db.prepare(
            'UPDATE sessions SET messages = ?, metadata = ?, updated_at = datetime("now") WHERE id = ?'
        ).run(
            JSON.stringify(session.messages),
            JSON.stringify(session.metadata),
            session.id,
        );
    }

    /**
     * Add a message to a session and save
     */
    addMessage(session: Session, message: Message): void {
        session.messages.push(message);
        session.updatedAt = new Date();
        this.save(session);
    }

    /**
     * Get all sessions
     */
    listSessions(): Session[] {
        const db = getDb();
        const rows = db.prepare('SELECT * FROM sessions ORDER BY updated_at DESC').all() as any[];
        return rows.map(row => ({
            id: row.id,
            channelName: row.channel_name,
            chatId: row.chat_id,
            userId: row.user_id,
            messages: JSON.parse(row.messages || '[]'),
            metadata: JSON.parse(row.metadata || '{}'),
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
        }));
    }

    /**
     * Delete a session
     */
    delete(sessionId: string): void {
        const db = getDb();
        db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
        logger.debug(`Session deleted: ${sessionId}`);
    }

    /**
     * Clear all messages from a session
     */
    clearMessages(session: Session): void {
        session.messages = [];
        this.save(session);
    }
}

// Singleton
let sessionManagerInstance: SessionManager | null = null;

export function getSessionManager(): SessionManager {
    if (!sessionManagerInstance) {
        sessionManagerInstance = new SessionManager();
    }
    return sessionManagerInstance;
}
