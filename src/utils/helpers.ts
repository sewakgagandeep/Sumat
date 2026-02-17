import fs from 'fs';
import path from 'path';
import { logger } from './logger.js';

/**
 * Safely read a file, returning null if it doesn't exist
 */
export function readFileSafe(filePath: string): string | null {
    try {
        return fs.readFileSync(filePath, 'utf-8');
    } catch {
        return null;
    }
}

/**
 * Write content to a file, creating parent directories as needed
 */
export function writeFileSafe(filePath: string, content: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * Get file size in bytes, or 0 if doesn't exist
 */
export function getFileSize(filePath: string): number {
    try {
        return fs.statSync(filePath).size;
    } catch {
        return 0;
    }
}

/**
 * Estimate token count from a string (rough: ~4 chars per token)
 */
export function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

/**
 * Truncate text to a max length with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Resolve ~ to home directory
 */
export function resolvePath(p: string): string {
    if (p.startsWith('~')) {
        return path.join(require('os').homedir(), p.slice(1));
    }
    return path.resolve(p);
}

/**
 * Safe JSON parse with fallback
 */
export function parseJSON<T>(text: string, fallback: T): T {
    try {
        return JSON.parse(text) as T;
    } catch {
        logger.warn('Failed to parse JSON, using fallback');
        return fallback;
    }
}
