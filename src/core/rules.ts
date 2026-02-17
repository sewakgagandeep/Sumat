import fs from 'fs';
import path from 'path';
import { getWorkspacePath } from '../config/index.js';
import { logger } from '../utils/logger.js';

const RULES_FILENAME = 'RULES.md';

let cachedRules: string = '';
let rulesWatcher: fs.FSWatcher | null = null;

/**
 * RulesEngine — loads and hot-reloads RULES.md from the workspace.
 * Rules are injected into the agent's system prompt as behavioral constraints.
 *
 * RULES.md contains user-defined, runtime-modifiable rules like:
 *   - "Always respond in English"
 *   - "Never execute rm -rf commands"
 *   - "Prefer concise responses"
 */
export class RulesEngine {
    private rulesPath: string;

    constructor() {
        this.rulesPath = path.join(getWorkspacePath(), RULES_FILENAME);
        this.load();
    }

    /**
     * Load rules from RULES.md
     */
    private load(): void {
        try {
            if (fs.existsSync(this.rulesPath)) {
                cachedRules = fs.readFileSync(this.rulesPath, 'utf-8').trim();
                logger.debug(`Rules loaded (${cachedRules.length} chars)`);
            } else {
                cachedRules = '';
                logger.debug('No RULES.md found');
            }
        } catch (err: any) {
            logger.warn('Failed to load RULES.md', { error: err.message });
            cachedRules = '';
        }
    }

    /**
     * Get the current rules text for system prompt injection.
     */
    getRules(): string {
        return cachedRules;
    }

    /**
     * Start watching RULES.md for changes.
     */
    startWatching(): void {
        if (rulesWatcher) return;

        const dir = path.dirname(this.rulesPath);
        if (!fs.existsSync(dir)) return;

        let debounce: ReturnType<typeof setTimeout> | null = null;

        try {
            rulesWatcher = fs.watch(dir, (_, changedFile) => {
                if (changedFile !== RULES_FILENAME) return;
                if (debounce) clearTimeout(debounce);
                debounce = setTimeout(() => {
                    logger.info('RULES.md changed, reloading...');
                    this.load();
                }, 300);
            });
            logger.info('Rules watcher started');
        } catch (err: any) {
            logger.warn('Could not start rules watcher', { error: err.message });
        }
    }

    /**
     * Stop watching.
     */
    stopWatching(): void {
        if (rulesWatcher) {
            rulesWatcher.close();
            rulesWatcher = null;
        }
    }

    /**
     * Format rules for injection into system prompt.
     */
    getPromptSection(): string {
        if (!cachedRules) return '';
        return `\n## Dynamic Rules\nThe following rules are active and must be followed:\n\n${cachedRules}\n`;
    }
}

// Singleton
let rulesInstance: RulesEngine | null = null;

export function getRulesEngine(): RulesEngine {
    if (!rulesInstance) {
        rulesInstance = new RulesEngine();
    }
    return rulesInstance;
}
