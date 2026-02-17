import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { getConfig } from '../../config/index.js';
import { getWorkspacePath } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import type { ToolDefinition, ToolContext, ToolResult } from '../../types.js';
import { cronAddTool, cronListTool, cronRemoveTool } from './cron.js';

// ==============================================
// Dangerous command blocklist (PicoClaw pattern)
// ==============================================

function isBlockedCommand(command: string): boolean {
    const config = getConfig();
    const blocklist = config.security.blocklist;
    const lower = command.toLowerCase().trim();

    for (const blocked of blocklist) {
        if (lower.includes(blocked.toLowerCase())) {
            return true;
        }
    }
    return false;
}

function isPathAllowed(targetPath: string, context: ToolContext): boolean {
    const config = getConfig();
    if (!config.security.sandbox.restrictToWorkspace) return true;

    const resolved = path.resolve(targetPath);
    const workspace = path.resolve(context.workspacePath);
    return resolved.startsWith(workspace);
}

// ==============================================
// Built-in Tools
// ==============================================

export const bashTool: ToolDefinition = {
    name: 'bash',
    description: 'Execute a shell command. Returns stdout and stderr.',
    parameters: {
        type: 'object',
        properties: {
            command: { type: 'string', description: 'The shell command to execute' },
            cwd: { type: 'string', description: 'Working directory (optional, defaults to workspace)' },
        },
        required: ['command'],
    },
    approvalLevel: 'supervised',

    async execute(args, context): Promise<ToolResult> {
        const command = args.command as string;
        const cwd = (args.cwd as string) || context.workspacePath;

        // Security checks
        if (isBlockedCommand(command)) {
            return { toolCallId: context.sessionId, content: `Command blocked by safety guard: "${command}"`, isError: true };
        }

        if (!isPathAllowed(cwd, context)) {
            return { toolCallId: context.sessionId, content: `Working directory outside workspace: "${cwd}"`, isError: true };
        }

        return new Promise((resolve) => {
            exec(command, { cwd, timeout: 60000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
                const output = [];
                if (stdout) output.push(`STDOUT:\n${stdout}`);
                if (stderr) output.push(`STDERR:\n${stderr}`);
                if (error) output.push(`EXIT CODE: ${error.code || 1}`);
                else output.push(`EXIT CODE: 0`);

                resolve({
                    toolCallId: context.sessionId,
                    content: output.join('\n\n') || 'Command completed with no output.',
                    isError: !!error,
                });
            });
        });
    },
};

export const readFileTool: ToolDefinition = {
    name: 'read_file',
    description: 'Read the contents of a file.',
    parameters: {
        type: 'object',
        properties: {
            path: { type: 'string', description: 'File path (relative to workspace or absolute)' },
        },
        required: ['path'],
    },
    approvalLevel: 'read',

    async execute(args, context): Promise<ToolResult> {
        const filePath = path.isAbsolute(args.path as string)
            ? (args.path as string)
            : path.join(context.workspacePath, args.path as string);

        if (!isPathAllowed(filePath, context)) {
            return { toolCallId: context.sessionId, content: `Path outside workspace: "${filePath}"`, isError: true };
        }

        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            return { toolCallId: context.sessionId, content };
        } catch (err: any) {
            return { toolCallId: context.sessionId, content: `Error reading file: ${err.message}`, isError: true };
        }
    },
};

export const writeFileTool: ToolDefinition = {
    name: 'write_file',
    description: 'Write content to a file. Creates parent directories if needed.',
    parameters: {
        type: 'object',
        properties: {
            path: { type: 'string', description: 'File path (relative to workspace or absolute)' },
            content: { type: 'string', description: 'File content to write' },
        },
        required: ['path', 'content'],
    },
    approvalLevel: 'supervised',

    async execute(args, context): Promise<ToolResult> {
        const filePath = path.isAbsolute(args.path as string)
            ? (args.path as string)
            : path.join(context.workspacePath, args.path as string);

        if (!isPathAllowed(filePath, context)) {
            return { toolCallId: context.sessionId, content: `Path outside workspace: "${filePath}"`, isError: true };
        }

        try {
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(filePath, args.content as string, 'utf-8');
            return { toolCallId: context.sessionId, content: `File written: ${filePath}` };
        } catch (err: any) {
            return { toolCallId: context.sessionId, content: `Error writing file: ${err.message}`, isError: true };
        }
    },
};

export const listDirTool: ToolDefinition = {
    name: 'list_dir',
    description: 'List files and directories in a given path.',
    parameters: {
        type: 'object',
        properties: {
            path: { type: 'string', description: 'Directory path (defaults to workspace root)' },
        },
    },
    approvalLevel: 'read',

    async execute(args, context): Promise<ToolResult> {
        const dirPath = args.path
            ? (path.isAbsolute(args.path as string)
                ? (args.path as string)
                : path.join(context.workspacePath, args.path as string))
            : context.workspacePath;

        if (!isPathAllowed(dirPath, context)) {
            return { toolCallId: context.sessionId, content: `Path outside workspace: "${dirPath}"`, isError: true };
        }

        try {
            const entries = fs.readdirSync(dirPath, { withFileTypes: true });
            const listing = entries.map(e => {
                const indicator = e.isDirectory() ? '📁' : '📄';
                const size = e.isFile() ? ` (${fs.statSync(path.join(dirPath, e.name)).size} bytes)` : '';
                return `${indicator} ${e.name}${size}`;
            }).join('\n');
            return { toolCallId: context.sessionId, content: listing || 'Empty directory.' };
        } catch (err: any) {
            return { toolCallId: context.sessionId, content: `Error listing directory: ${err.message}`, isError: true };
        }
    },
};

export const webSearchTool: ToolDefinition = {
    name: 'web_search',
    description: 'Search the web using DuckDuckGo. Returns search results.',
    parameters: {
        type: 'object',
        properties: {
            query: { type: 'string', description: 'Search query' },
            maxResults: { type: 'number', description: 'Max results to return (default 5)' },
        },
        required: ['query'],
    },
    approvalLevel: 'read',

    async execute(args, context): Promise<ToolResult> {
        const query = args.query as string;
        const maxResults = (args.maxResults as number) || 5;

        try {
            // Use DuckDuckGo HTML API (no API key needed)
            const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
            const response = await fetch(url, {
                headers: { 'User-Agent': 'Sumat/1.0' },
            });
            const html = await response.text();

            // Basic extraction of results
            const results: string[] = [];
            const regex = /<a rel="nofollow" class="result__a" href="([^"]+)">([^<]+)<\/a>/g;
            let match;
            while ((match = regex.exec(html)) && results.length < maxResults) {
                results.push(`• ${match[2].trim()}\n  ${match[1]}`);
            }

            return {
                toolCallId: context.sessionId,
                content: results.length > 0
                    ? `Search results for "${query}":\n\n${results.join('\n\n')}`
                    : `No results found for "${query}".`,
            };
        } catch (err: any) {
            return { toolCallId: context.sessionId, content: `Search error: ${err.message}`, isError: true };
        }
    },
};

export const webFetchTool: ToolDefinition = {
    name: 'web_fetch',
    description: 'Fetch the contents of a URL. Returns the text content.',
    parameters: {
        type: 'object',
        properties: {
            url: { type: 'string', description: 'URL to fetch' },
            maxLength: { type: 'number', description: 'Max content length to return (default 10000)' },
        },
        required: ['url'],
    },
    approvalLevel: 'read',

    async execute(args, context): Promise<ToolResult> {
        const url = args.url as string;
        const maxLength = (args.maxLength as number) || 10000;

        try {
            const response = await fetch(url, {
                headers: { 'User-Agent': 'Sumat/1.0' },
                signal: AbortSignal.timeout(15000),
            });

            if (!response.ok) {
                return { toolCallId: context.sessionId, content: `HTTP ${response.status}: ${response.statusText}`, isError: true };
            }

            let text = await response.text();

            // Strip HTML tags for basic text extraction
            text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
            text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
            text = text.replace(/<[^>]+>/g, ' ');
            text = text.replace(/\s+/g, ' ').trim();

            if (text.length > maxLength) {
                text = text.slice(0, maxLength) + '... [truncated]';
            }

            return { toolCallId: context.sessionId, content: text };
        } catch (err: any) {
            return { toolCallId: context.sessionId, content: `Fetch error: ${err.message}`, isError: true };
        }
    },
};

// ==============================================
// Sub-Agent Tools
// ==============================================

export const spawnSubAgentTool: ToolDefinition = {
    name: 'spawn_sub_agent',
    description: 'Delegate a task to a background sub-agent. The sub-agent runs asynchronously and you can check its result later with check_sub_agent. Use for long-running or independent tasks.',
    parameters: {
        type: 'object',
        properties: {
            task: { type: 'string', description: 'A clear description of the task to delegate' },
        },
        required: ['task'],
    },
    approvalLevel: 'supervised',

    async execute(args, context): Promise<ToolResult> {
        const { getSubAgentManager } = await import('../../core/sub-agent.js');
        const task = args.task as string;

        try {
            const subTask = await getSubAgentManager().spawn(task, context.sessionId);
            return {
                toolCallId: context.sessionId,
                content: `Sub-agent spawned with ID: ${subTask.id}\nTask: ${task}\nStatus: ${subTask.status}\n\nUse check_sub_agent with this ID to poll for results.`,
            };
        } catch (err: any) {
            return { toolCallId: context.sessionId, content: `Sub-agent error: ${err.message}`, isError: true };
        }
    },
};

export const checkSubAgentTool: ToolDefinition = {
    name: 'check_sub_agent',
    description: 'Check the status and result of a previously spawned sub-agent task.',
    parameters: {
        type: 'object',
        properties: {
            taskId: { type: 'string', description: 'The sub-agent task ID (returned by spawn_sub_agent)' },
        },
        required: ['taskId'],
    },
    approvalLevel: 'read',

    async execute(args, context): Promise<ToolResult> {
        const { getSubAgentManager } = await import('../../core/sub-agent.js');
        const taskId = args.taskId as string;

        const task = getSubAgentManager().getTask(taskId);
        if (!task) {
            return { toolCallId: context.sessionId, content: `No sub-agent task found with ID: ${taskId}`, isError: true };
        }

        const lines = [
            `Task ID: ${task.id}`,
            `Status: ${task.status}`,
            `Description: ${task.description}`,
        ];

        if (task.result) lines.push(`\nResult:\n${task.result}`);
        if (task.error) lines.push(`\nError: ${task.error}`);
        if (task.completedAt) lines.push(`Completed: ${task.completedAt.toISOString()}`);

        return { toolCallId: context.sessionId, content: lines.join('\n') };
    },
};

// ==============================================
// Browser Automation Tool
// ==============================================

let browserInstance: any = null;
let browserPage: any = null;
let browserIdleTimer: ReturnType<typeof setTimeout> | null = null;

async function getBrowserPage() {
    const config = getConfig();
    if (!config.automation.browser.enabled) {
        throw new Error('Browser automation is disabled. Set automation.browser.enabled = true in config.');
    }

    if (browserPage) {
        // Reset idle timer
        if (browserIdleTimer) clearTimeout(browserIdleTimer);
        browserIdleTimer = setTimeout(closeBrowser, 30000);
        return browserPage;
    }

    const { chromium } = await import('playwright');
    browserInstance = await chromium.launch({
        headless: config.automation.browser.headless,
    });
    browserPage = await browserInstance.newPage();

    // Auto-close after 30s idle
    browserIdleTimer = setTimeout(closeBrowser, 30000);

    logger.info('Browser launched');
    return browserPage;
}

async function closeBrowser() {
    if (browserIdleTimer) {
        clearTimeout(browserIdleTimer);
        browserIdleTimer = null;
    }
    if (browserInstance) {
        await browserInstance.close().catch(() => { });
        browserInstance = null;
        browserPage = null;
        logger.info('Browser closed (idle timeout)');
    }
}

export const browserTool: ToolDefinition = {
    name: 'browser_action',
    description: 'Control a headless browser. Actions: navigate (go to URL), screenshot (capture page), click (click element by selector), type (type text into element), evaluate (run JS in page), content (get page text content).',
    parameters: {
        type: 'object',
        properties: {
            action: {
                type: 'string',
                description: 'Action to perform: navigate | screenshot | click | type | evaluate | content',
            },
            url: { type: 'string', description: 'URL to navigate to (for navigate action)' },
            selector: { type: 'string', description: 'CSS selector (for click/type actions)' },
            text: { type: 'string', description: 'Text to type (for type action)' },
            script: { type: 'string', description: 'JavaScript code to evaluate (for evaluate action)' },
        },
        required: ['action'],
    },
    approvalLevel: 'supervised',

    async execute(args, context): Promise<ToolResult> {
        const action = args.action as string;

        try {
            const page = await getBrowserPage();

            switch (action) {
                case 'navigate': {
                    const url = args.url as string;
                    if (!url) return { toolCallId: context.sessionId, content: 'url required for navigate', isError: true };
                    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
                    return { toolCallId: context.sessionId, content: `Navigated to: ${url}\nTitle: ${await page.title()}` };
                }

                case 'screenshot': {
                    const screenshotPath = path.join(context.workspacePath, 'state', `screenshot_${Date.now()}.png`);
                    const dir = path.dirname(screenshotPath);
                    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                    await page.screenshot({ path: screenshotPath, fullPage: false });
                    return { toolCallId: context.sessionId, content: `Screenshot saved: ${screenshotPath}` };
                }

                case 'click': {
                    const selector = args.selector as string;
                    if (!selector) return { toolCallId: context.sessionId, content: 'selector required for click', isError: true };
                    await page.click(selector, { timeout: 5000 });
                    return { toolCallId: context.sessionId, content: `Clicked: ${selector}` };
                }

                case 'type': {
                    const selector = args.selector as string;
                    const text = args.text as string;
                    if (!selector || !text) return { toolCallId: context.sessionId, content: 'selector and text required for type', isError: true };
                    await page.fill(selector, text);
                    return { toolCallId: context.sessionId, content: `Typed "${text}" into ${selector}` };
                }

                case 'evaluate': {
                    const script = args.script as string;
                    if (!script) return { toolCallId: context.sessionId, content: 'script required for evaluate', isError: true };
                    const result = await page.evaluate(script);
                    return { toolCallId: context.sessionId, content: `Result: ${JSON.stringify(result, null, 2)}` };
                }

                case 'content': {
                    const content = await page.textContent('body');
                    const truncated = (content || '').slice(0, 5000);
                    return { toolCallId: context.sessionId, content: truncated || 'Page has no text content.' };
                }

                default:
                    return { toolCallId: context.sessionId, content: `Unknown action: ${action}. Valid: navigate, screenshot, click, type, evaluate, content`, isError: true };
            }
        } catch (err: any) {
            return { toolCallId: context.sessionId, content: `Browser error: ${err.message}`, isError: true };
        }
    },
};

/**
 * Register all built-in tools to a registry
 */
export function registerBuiltinTools(registry: { register: (tool: ToolDefinition) => void }): void {
    const tools = [
        bashTool, readFileTool, writeFileTool, listDirTool,
        webSearchTool, webFetchTool,
        spawnSubAgentTool, checkSubAgentTool,
        browserTool,
        cronAddTool, cronListTool, cronRemoveTool,
    ];
    for (const tool of tools) {
        registry.register(tool);
    }
    logger.info(`Registered ${tools.length} built-in tools`);
}
