import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { logger } from './logger.js';

const DB_DIR = path.join(os.homedir(), '.sumat');
const DB_PATH = path.join(DB_DIR, 'sumat.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  initializeSchema(db);
  logger.info('Database initialized', { path: DB_PATH });
  return db;
}

function initializeSchema(db: Database.Database): void {
  db.exec(`
    -- Sessions table
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      channel_name TEXT NOT NULL,
      chat_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      messages TEXT NOT NULL DEFAULT '[]',
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_chat ON sessions(channel_name, chat_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

    -- Memory table
    CREATE TABLE IF NOT EXISTS memory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_memory_key ON memory(key);
    CREATE INDEX IF NOT EXISTS idx_memory_category ON memory(category);

    -- Cron jobs table
    CREATE TABLE IF NOT EXISTS cron_jobs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      schedule TEXT NOT NULL,
      message TEXT NOT NULL,
      channel_name TEXT,
      chat_id TEXT,
      user_id TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      last_run TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );



    -- Pairing codes table
    CREATE TABLE IF NOT EXISTS pairing_codes (
      code TEXT PRIMARY KEY,
      user_id TEXT,
      channel_name TEXT,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_pairing_expires ON pairing_codes(expires_at);

    -- Usage tracking table
    CREATE TABLE IF NOT EXISTS usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      prompt_tokens INTEGER NOT NULL DEFAULT 0,
      completion_tokens INTEGER NOT NULL DEFAULT 0,
      total_tokens INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_usage_session ON usage(session_id);
    CREATE INDEX IF NOT EXISTS idx_usage_date ON usage(created_at);
  `);

  // Migrations
  try {
    const columns = db.prepare('PRAGMA table_info(cron_jobs)').all() as any[];
    const hasUserId = columns.some(c => c.name === 'user_id');
    if (!hasUserId) {
      db.prepare('ALTER TABLE cron_jobs ADD COLUMN user_id TEXT').run();
    }
  } catch (error) {
    // Ignore
  }
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
    logger.info('Database closed');
  }
}
