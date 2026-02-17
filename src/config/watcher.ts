import fs from 'fs';
import path from 'path';
import os from 'os';
import { loadConfig } from './index.js';
import { bus } from '../bus/index.js';
import { logger, setLogLevel } from '../utils/logger.js';

const CONFIG_PATH = process.env.SUMAT_CONFIG_PATH
    ? path.resolve(process.env.SUMAT_CONFIG_PATH)
    : path.join(os.homedir(), '.sumat', 'config.json');

let watcher: fs.FSWatcher | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Start watching config.json for changes.
 * On change: reloads config, updates log level, emits bus event.
 * Uses 500ms debounce to avoid rapid-fire reloads.
 */
export function startConfigWatcher(): void {
    if (watcher) return;

    const dir = path.dirname(CONFIG_PATH);
    const fileName = path.basename(CONFIG_PATH);

    if (!fs.existsSync(dir)) {
        logger.debug('Config directory does not exist, skipping watcher');
        return;
    }

    try {
        watcher = fs.watch(dir, (eventType, changedFile) => {
            if (changedFile !== fileName) return;

            // Debounce
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                try {
                    logger.info('Config file changed, reloading...');
                    const config = loadConfig();
                    setLogLevel(config.logLevel);
                    bus.emit('config:reloaded', { config });
                    logger.info('Config reloaded successfully');
                } catch (err: any) {
                    logger.error('Failed to reload config', { error: err.message });
                }
            }, 500);
        });

        logger.info(`Config watcher started on ${CONFIG_PATH}`);
    } catch (err: any) {
        logger.warn('Could not start config watcher', { error: err.message });
    }
}

/**
 * Stop watching config.json.
 */
export function stopConfigWatcher(): void {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
    }
    if (watcher) {
        watcher.close();
        watcher = null;
        logger.debug('Config watcher stopped');
    }
}
