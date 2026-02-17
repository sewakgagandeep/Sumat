import winston from 'winston';
import path from 'path';
import os from 'os';
import fs from 'fs';

const LOG_DIR = path.join(os.homedir(), '.sumat', 'logs');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        const stackStr = stack ? `\n${stack}` : '';
        return `${timestamp} [${level.toUpperCase().padEnd(5)}] ${message}${metaStr}${stackStr}`;
    })
);

export const logger = winston.createLogger({
    level: process.env.SUMAT_LOG_LEVEL || 'info',
    format: logFormat,
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                logFormat
            ),
        }),
        new winston.transports.File({
            filename: path.join(LOG_DIR, 'error.log'),
            level: 'error',
            maxsize: 5 * 1024 * 1024,  // 5MB
            maxFiles: 3,
        }),
        new winston.transports.File({
            filename: path.join(LOG_DIR, 'combined.log'),
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5,
        }),
    ],
});

export function setLogLevel(level: string): void {
    logger.level = level;
}
