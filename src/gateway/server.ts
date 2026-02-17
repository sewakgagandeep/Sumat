import { WebSocketServer, WebSocket } from 'ws';
import express from 'express';
import http from 'http';
import { bus } from '../bus/index.js';
import { getConfig } from '../config/index.js';
import { getFailoverManager } from '../providers/failover.js';
import { logger } from '../utils/logger.js';
import { getPairingService } from '../core/pairing.js';
import { getUsageTracker } from '../core/usage.js';
import type { IncomingMessage } from '../types.js';

/**
 * Gateway WebSocket Server — central control plane (OpenClaw pattern).
 * Handles WebSocket connections, REST webhooks, and status API.
 * Supports auth modes: none, password, pairing.
 */
export class GatewayServer {
    private wss: WebSocketServer | null = null;
    private server: http.Server | null = null;
    private app: express.Express;
    private clients: Map<string, WebSocket> = new Map();

    constructor() {
        this.app = express();
        this.app.use(express.json());
        this.setupRoutes();
    }

    /**
     * Auth middleware — enforces authentication based on config.gateway.auth.mode.
     * Health + pairing endpoints are always open. Everything else is gated.
     */
    private authMiddleware(): express.RequestHandler {
        return (req, res, next) => {
            const config = getConfig();
            const mode = config.gateway.auth.mode;

            // Always allow health + pairing endpoints
            if (req.path === '/health' || req.path.startsWith('/api/pairing')) {
                return next();
            }

            if (mode === 'none') return next();

            if (mode === 'password') {
                const token = this.extractBearerToken(req);
                if (token && token === config.gateway.auth.password) {
                    return next();
                }
                res.status(401).json({ error: 'Unauthorized — invalid password token' });
                return;
            }

            if (mode === 'pairing') {
                const token = this.extractBearerToken(req);
                if (token && getPairingService().isTokenValid(token)) {
                    return next();
                }
                res.status(401).json({ error: 'Unauthorized — pair first via /api/pairing/validate' });
                return;
            }

            next();
        };
    }

    private extractBearerToken(req: express.Request): string | null {
        const header = req.headers.authorization;
        if (header && header.startsWith('Bearer ')) {
            return header.slice(7);
        }
        return (req.query.token as string) || null;
    }

    private setupRoutes(): void {
        // Health check (always open)
        this.app.get('/health', (_req, res) => {
            res.json({ status: 'ok', uptime: process.uptime() });
        });

        // Pairing endpoints (always open)
        this.app.post('/api/pairing/generate', (req, res) => {
            const { userId, channelName } = req.body || {};
            const pairing = getPairingService();
            const code = pairing.generate(userId, channelName);
            res.json({ code, expiresInMinutes: 10 });
        });

        this.app.post('/api/pairing/validate', (req, res) => {
            const { code } = req.body;
            if (!code) {
                res.status(400).json({ error: 'code field required' });
                return;
            }
            const pairing = getPairingService();
            const result = pairing.validate(code);
            if (result.valid) {
                res.json({ status: 'paired', token: result.token });
            } else {
                res.status(401).json({ status: 'invalid', error: 'Code is invalid, expired, or already used' });
            }
        });

        this.app.get('/api/pairing/active', (_req, res) => {
            const codes = getPairingService().listActive();
            res.json({ codes });
        });

        // Apply auth middleware for all routes below
        this.app.use(this.authMiddleware());

        // Status endpoint
        this.app.get('/api/status', async (_req, res) => {
            const failover = getFailoverManager();
            const providerStatus = await failover.getStatus();
            res.json({
                status: 'running',
                uptime: process.uptime(),
                providers: providerStatus,
                connectedClients: this.clients.size,
            });
        });

        // Usage analytics endpoint
        this.app.get('/api/usage', (_req, res) => {
            const days = parseInt(_req.query.days as string) || 7;
            const tracker = getUsageTracker();
            res.json({
                summary: tracker.getSummary(days),
                daily: tracker.getDailyUsage(days),
                period: `${days} days`,
            });
        });

        // Webhook trigger
        this.app.post('/api/webhook', (req, res) => {
            const { text, chatId, userId, channel } = req.body;
            if (!text) {
                res.status(400).json({ error: 'text field required' });
                return;
            }

            const incoming: IncomingMessage = {
                id: `webhook_${Date.now()}`,
                channelName: channel || 'webhook',
                chatId: chatId || 'webhook',
                userId: userId || 'webhook',
                text,
                isGroup: false,
                timestamp: new Date(),
            };

            bus.emit('message:incoming', incoming);
            res.json({ status: 'accepted', id: incoming.id });
        });

        // Send a message to the agent
        this.app.post('/api/chat', async (req, res) => {
            const { text, chatId } = req.body;
            if (!text) {
                res.status(400).json({ error: 'text field required' });
                return;
            }

            const incoming: IncomingMessage = {
                id: `api_${Date.now()}`,
                channelName: 'api',
                chatId: chatId || 'default',
                userId: 'api',
                text,
                isGroup: false,
                timestamp: new Date(),
            };

            bus.emit('message:incoming', incoming);
            res.json({ status: 'accepted', id: incoming.id });
        });
    }

    async start(): Promise<void> {
        const config = getConfig();
        const { host, port } = config.gateway;

        this.server = http.createServer(this.app);
        this.wss = new WebSocketServer({ server: this.server });

        this.wss.on('connection', (ws, req) => {
            // WebSocket auth check
            const authMode = config.gateway.auth.mode;
            if (authMode !== 'none') {
                const url = new URL(req.url || '/', `http://${req.headers.host}`);
                const token = url.searchParams.get('token');

                if (authMode === 'password' && token !== config.gateway.auth.password) {
                    ws.close(4001, 'Unauthorized');
                    return;
                }
                if (authMode === 'pairing' && (!token || !getPairingService().isTokenValid(token))) {
                    ws.close(4001, 'Unauthorized — pair first');
                    return;
                }
            }

            const clientId = `ws_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
            this.clients.set(clientId, ws);
            logger.info(`WebSocket client connected: ${clientId}`);

            ws.on('message', (raw) => {
                try {
                    const data = JSON.parse(raw.toString());

                    if (data.type === 'chat') {
                        const incoming: IncomingMessage = {
                            id: data.id || `ws_${Date.now()}`,
                            channelName: 'websocket',
                            chatId: data.chatId || clientId,
                            userId: data.userId || clientId,
                            text: data.text || '',
                            isGroup: false,
                            timestamp: new Date(),
                        };
                        bus.emit('message:incoming', incoming);
                    }
                } catch (err: any) {
                    logger.warn('Invalid WebSocket message', { error: err.message });
                }
            });

            ws.on('close', () => {
                this.clients.delete(clientId);
                logger.info(`WebSocket client disconnected: ${clientId}`);
            });

            ws.on('error', (err) => {
                logger.error('WebSocket error', { clientId, error: err.message });
            });

            // Send initial connection message
            ws.send(JSON.stringify({ type: 'connected', clientId }));
        });

        // Broadcast agent responses to all WebSocket clients
        bus.on('agent:response', (data) => {
            const payload = JSON.stringify({
                type: 'response',
                sessionId: data.sessionId,
                text: data.text,
            });
            for (const [, ws] of this.clients) {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(payload);
                }
            }
        });

        // Forward outgoing messages for websocket channel
        bus.on('message:outgoing', (data) => {
            if (data.channelName !== 'websocket') return;
            const payload = JSON.stringify({ type: 'message', chatId: data.chatId, text: data.text });
            for (const [id, ws] of this.clients) {
                if (id === data.chatId || data.chatId === 'broadcast') {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(payload);
                    }
                }
            }
        });

        return new Promise((resolve) => {
            this.server!.listen(port, host, () => {
                logger.info(`Gateway server listening on ws://${host}:${port} (auth: ${config.gateway.auth.mode})`);
                resolve();
            });
        });
    }

    async stop(): Promise<void> {
        // Close all WebSocket connections
        for (const [, ws] of this.clients) {
            ws.close();
        }
        this.clients.clear();

        if (this.wss) {
            this.wss.close();
        }
        if (this.server) {
            this.server.close();
        }
        logger.info('Gateway server stopped');
    }
}

// Singleton
let gatewayInstance: GatewayServer | null = null;

export function getGatewayServer(): GatewayServer {
    if (!gatewayInstance) {
        gatewayInstance = new GatewayServer();
    }
    return gatewayInstance;
}
