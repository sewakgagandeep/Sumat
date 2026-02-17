// Sumat — Personal AI Agent Framework
// Shared types used across the entire system

// ============================================
// Message Types
// ============================================

export interface Message {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string | ContentBlock[];
    name?: string;
    toolCallId?: string;
    toolCalls?: ToolCall[];
}

export interface ContentBlock {
    type: 'text' | 'image' | 'audio' | 'file';
    text?: string;
    data?: string;       // base64 for binary
    mimeType?: string;
    url?: string;
    fileName?: string;
}

export interface ToolCall {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
}

export interface ToolResult {
    toolCallId: string;
    content: string;
    isError?: boolean;
}

// ============================================
// Stream Types
// ============================================

export interface StreamChunk {
    type: 'text' | 'tool_call_start' | 'tool_call_delta' | 'tool_call_end' | 'done' | 'error';
    text?: string;
    toolCall?: Partial<ToolCall>;
    error?: string;
    usage?: TokenUsage;
}

export interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

// ============================================
// Tool Types
// ============================================

export type ApprovalLevel = 'read' | 'supervised' | 'autonomous';

export interface ToolDefinition {
    name: string;
    description: string;
    parameters: Record<string, unknown>;  // JSON Schema
    approvalLevel: ApprovalLevel;
    execute: (args: Record<string, unknown>, context: ToolContext) => Promise<ToolResult>;
}

export interface ToolContext {
    sessionId: string;
    userId: string;
    channelName: string;
    workspacePath: string;
    requestApproval: (description: string) => Promise<boolean>;
    sendMessage: (content: string) => Promise<void>;
}

// ============================================
// Channel Types
// ============================================

export interface IncomingMessage {
    id: string;
    channelName: string;
    chatId: string;
    userId: string;
    userName?: string;
    text: string;
    media?: MediaAttachment[];
    replyToMessageId?: string;
    isGroup: boolean;
    groupName?: string;
    timestamp: Date;
    raw?: unknown;
}

export interface MediaAttachment {
    type: 'image' | 'audio' | 'video' | 'document';
    url?: string;
    data?: Buffer;
    mimeType: string;
    fileName?: string;
    size?: number;
}

export interface OutgoingMessage {
    chatId: string;
    text?: string;
    media?: MediaAttachment[];
    replyToMessageId?: string;
    parseMode?: 'Markdown' | 'HTML';
    buttons?: MessageButton[][];
}

export interface MessageButton {
    text: string;
    callbackData?: string;
    url?: string;
}

// ============================================
// Session Types
// ============================================

export interface Session {
    id: string;
    channelName: string;
    chatId: string;
    userId: string;
    messages: Message[];
    metadata: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

// ============================================
// Config Types
// ============================================

export interface SumatConfig {
    agent: AgentConfig;
    providers: ProvidersConfig;
    channels: ChannelsConfig;
    gateway: GatewayConfig;
    automation: AutomationConfig;
    security: SecurityConfig;
    skills: SkillsConfig;
    workspace: string;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface AgentConfig {
    model: string;
    maxTokens: number;
    temperature: number;
    maxTurns: number;                 // Max tool-call loops before stopping
    compactionThreshold: number;      // Token count before session compaction
    providerPriority: string[];       // Ordered failover list
}

export interface ProvidersConfig {
    anthropic?: ProviderEntry;
    openai?: ProviderEntry;
    openrouter?: ProviderEntry;
    gemini?: ProviderEntry;
    glm?: ProviderEntry;
    minimax?: MinimaxProviderEntry;
    ollama?: OllamaProviderEntry;
    [key: string]: ProviderEntry | MinimaxProviderEntry | OllamaProviderEntry | undefined;
}

export interface ProviderEntry {
    apiKey: string;
    baseUrl?: string;
    model?: string;
}

export interface MinimaxProviderEntry extends ProviderEntry {
    groupId?: string;
}

export interface OllamaProviderEntry {
    baseUrl: string;
    model?: string;
}

export interface ChannelsConfig {
    telegram?: TelegramChannelConfig;
    webchat?: WebchatChannelConfig;
}

export interface TelegramChannelConfig {
    botToken: string;
    allowedUsers?: string[];          // Telegram user IDs or usernames
    allowedGroups?: string[];
}

export interface WebchatChannelConfig {
    enabled: boolean;
}

export interface GatewayConfig {
    host: string;
    port: number;
    auth: {
        mode: 'none' | 'password' | 'pairing';
        password?: string;
    };
}

export interface AutomationConfig {
    heartbeat: {
        enabled: boolean;
        intervalMinutes: number;
    };
    cron: {
        enabled: boolean;
    };
    browser: {
        enabled: boolean;
        headless: boolean;
    };
}

export interface SecurityConfig {
    sandbox: {
        enabled: boolean;
        restrictToWorkspace: boolean;
        dockerMode: boolean;
    };
    approvalGates: {
        enabled: boolean;
        defaultLevel: ApprovalLevel;
    };
    blocklist: string[];
    pairingEnabled: boolean;
}

export interface SkillsConfig {
    enabled: boolean;
    directories: string[];            // Extra skill directories to scan
    autoLoad: boolean;
}

// ============================================
// Skill Types
// ============================================

export interface SkillManifest {
    name: string;
    description: string;
    version?: string;
    author?: string;
    tools?: string[];
    dependencies?: string[];
    instructions: string;             // Parsed markdown body
    path: string;                     // Filesystem path
}

// ============================================
// Event Bus Types
// ============================================

export interface BusEvents {
    'message:incoming': IncomingMessage;
    'message:outgoing': OutgoingMessage & { channelName: string };
    'agent:thinking': { sessionId: string };
    'agent:response': { sessionId: string; text: string };
    'agent:tool_call': { sessionId: string; toolName: string; args: Record<string, unknown> };
    'agent:error': { sessionId: string; error: Error };
    'approval:request': { id: string; description: string; sessionId: string };
    'approval:response': { id: string; approved: boolean };
    'cron:trigger': { jobId: string; message: string; channelName?: string; chatId?: string; userId?: string };
    'heartbeat:tick': { timestamp: Date };
    'session:created': { sessionId: string };
    'session:compacted': { sessionId: string; removedCount: number };
    'sub-agent:spawn': { taskId: string; description: string; parentSessionId: string };
    'sub-agent:complete': { taskId: string; parentSessionId: string; result: string; success: boolean };
    'config:reloaded': { config: SumatConfig };
}

export type BusEventName = keyof BusEvents;
