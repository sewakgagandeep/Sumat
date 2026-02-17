import { EventEmitter } from 'events';
import type { BusEvents, BusEventName } from '../types.js';
import { logger } from '../utils/logger.js';

/**
 * Internal message bus — typed EventEmitter for routing events
 * between channels, gateway, agent, and automation.
 */
class MessageBus {
    private emitter = new EventEmitter();

    constructor() {
        this.emitter.setMaxListeners(50);
    }

    on<E extends BusEventName>(event: E, handler: (data: BusEvents[E]) => void): void {
        this.emitter.on(event, handler as any);
    }

    once<E extends BusEventName>(event: E, handler: (data: BusEvents[E]) => void): void {
        this.emitter.once(event, handler as any);
    }

    off<E extends BusEventName>(event: E, handler: (data: BusEvents[E]) => void): void {
        this.emitter.off(event, handler as any);
    }

    emit<E extends BusEventName>(event: E, data: BusEvents[E]): void {
        logger.debug(`Bus event: ${event}`);
        this.emitter.emit(event, data);
    }

    /**
     * Wait for a specific event with a timeout
     */
    waitFor<E extends BusEventName>(event: E, timeoutMs: number = 30000): Promise<BusEvents[E]> {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.emitter.off(event, handler);
                reject(new Error(`Timeout waiting for event: ${event}`));
            }, timeoutMs);

            const handler = (data: BusEvents[E]) => {
                clearTimeout(timer);
                resolve(data);
            };

            this.emitter.once(event, handler as any);
        });
    }
}

// Singleton
export const bus = new MessageBus();
