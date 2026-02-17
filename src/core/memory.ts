import fs from 'fs';
import path from 'path';
import { getWorkspacePath } from '../config/index.js';
import { getDb } from '../utils/db.js';
import { logger } from '../utils/logger.js';

/**
 * Persistent memory system.
 * Stores facts, preferences, and knowledge the agent learns over time.
 * Uses both file-based MEMORY.md and SQLite for structured queries.
 */
export class MemoryManager {
    /**
     * Store a memory entry
     */
    store(key: string, value: string, category: string = 'general'): void {
        const db = getDb();

        // Upsert to SQLite
        db.prepare(`
      INSERT INTO memory (key, value, category, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = ?, category = ?, updated_at = datetime('now')
    `).run(key, value, category, value, category);

        // Also append to MEMORY.md for agent context
        this.appendToMemoryFile(key, value, category);
        logger.debug(`Memory stored: ${key}`);
    }

    /**
     * Retrieve a memory by key
     */
    get(key: string): string | null {
        const db = getDb();
        const row = db.prepare('SELECT value FROM memory WHERE key = ?').get(key) as any;
        return row?.value || null;
    }

    /**
     * Search memories by keyword
     */
    search(query: string, limit: number = 10): Array<{ key: string; value: string; category: string }> {
        const db = getDb();
        const rows = db.prepare(
            'SELECT key, value, category FROM memory WHERE key LIKE ? OR value LIKE ? ORDER BY updated_at DESC LIMIT ?'
        ).all(`%${query}%`, `%${query}%`, limit) as any[];

        return rows.map(r => ({ key: r.key, value: r.value, category: r.category }));
    }

    /**
     * Get all memories in a category
     */
    getByCategory(category: string): Array<{ key: string; value: string }> {
        const db = getDb();
        const rows = db.prepare(
            'SELECT key, value FROM memory WHERE category = ? ORDER BY updated_at DESC'
        ).all(category) as any[];
        return rows.map(r => ({ key: r.key, value: r.value }));
    }

    /**
     * Delete a memory
     */
    delete(key: string): void {
        const db = getDb();
        db.prepare('DELETE FROM memory WHERE key = ?').run(key);
    }

    /**
     * Get the full contents of MEMORY.md for context injection
     */
    getMemoryFileContents(): string {
        const wsPath = getWorkspacePath();
        const memoryDir = path.join(wsPath, 'memory');
        const memoryFile = path.join(memoryDir, 'MEMORY.md');

        try {
            if (fs.existsSync(memoryFile)) {
                return fs.readFileSync(memoryFile, 'utf-8');
            }
        } catch {
            // ignore
        }
        return '';
    }

    /**
     * Append a memory entry to MEMORY.md
     */
    private appendToMemoryFile(key: string, value: string, category: string): void {
        const wsPath = getWorkspacePath();
        const memoryDir = path.join(wsPath, 'memory');
        const memoryFile = path.join(memoryDir, 'MEMORY.md');

        if (!fs.existsSync(memoryDir)) {
            fs.mkdirSync(memoryDir, { recursive: true });
        }

        const entry = `\n## ${key}\n**Category**: ${category}\n${value}\n`;

        // Read existing, check if entry exists
        let existing = '';
        if (fs.existsSync(memoryFile)) {
            existing = fs.readFileSync(memoryFile, 'utf-8');
        } else {
            existing = '# Agent Memory\n\nPersistent knowledge stored by the agent.\n';
        }

        // Replace if key exists, otherwise append
        const keyHeader = `## ${key}`;
        if (existing.includes(keyHeader)) {
            const regex = new RegExp(`## ${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n[\\s\\S]*?(?=\\n## |$)`, 'g');
            existing = existing.replace(regex, entry.trim());
            fs.writeFileSync(memoryFile, existing, 'utf-8');
        } else {
            fs.appendFileSync(memoryFile, entry, 'utf-8');
        }
    }
}

// Singleton
let memoryInstance: MemoryManager | null = null;

export function getMemoryManager(): MemoryManager {
    if (!memoryInstance) {
        memoryInstance = new MemoryManager();
    }
    return memoryInstance;
}
