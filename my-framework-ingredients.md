# My Custom AI Framework - Ingredient List

> **Purpose**: This document defines the selected features, skills, and architectural patterns
> for building a custom AI agent framework. Each item includes a description of what it does,
> which reference frameworks implement it, and enough context for Claude Code to understand
> the implementation requirements.
>
> **Reference repos**: Located at `/Users/marwankashef/Desktop/YouTube/OpenClaw Antidote/`
> **Full analysis**: See `FRAMEWORK-DEEP-DIVE.md` in the same directory.

---

**Total selected items: 42**

## Identity & Personality

### 1. Soul.md Personality File

**What it does**: Define your AI's personality, values, and communication style in a simple text file. Like writing a character sheet.

**Reference implementations**: OpenClaw, NanoBot, ZeroClaw, PicoClaw

**Where to find reference code**:
- OpenClaw (`./openclaw/`): TypeScript, check `skills/` and `extensions/` directories
- ZeroClaw (`./zeroclaw/`): Rust trait-based, check `src/tools/` directory
- NanoBot (`./nanobot/`): Python, check `nanobot/skills/` and `nanobot/agent/tools/`
- PicoClaw (`./picoclaw/`): Go, check `workspace/skills/` and `pkg/tools/`

---

### 2. Dynamic Behavior Rules

**What it does**: Change how the AI behaves mid-conversation. No restart needed. It adapts immediately.

**Reference implementations**: Agent Zero, OpenClaw

**Where to find reference code**:
- OpenClaw (`./openclaw/`): TypeScript, check `skills/` and `extensions/` directories
- Agent Zero (`./agent-zero/`): Python, check `python/tools/` and `python/extensions/`

---

## Security & Safety

### 1. Execution Approval Gates

**What it does**: AI must ask your permission before running certain commands. Three levels: read-only, supervised, full autonomy.

**Reference implementations**: OpenClaw, ZeroClaw

**Where to find reference code**:
- OpenClaw (`./openclaw/`): TypeScript, check `skills/` and `extensions/` directories
- ZeroClaw (`./zeroclaw/`): Rust trait-based, check `src/tools/` directory

---

### 2. Pairing Code Access

**What it does**: New users must enter a 6-digit code you provide before they can talk to your AI. Prevents unauthorized access.

**Reference implementations**: OpenClaw, ZeroClaw, TinyClaw

**Where to find reference code**:
- OpenClaw (`./openclaw/`): TypeScript, check `skills/` and `extensions/` directories
- ZeroClaw (`./zeroclaw/`): Rust trait-based, check `src/tools/` directory
- TinyClaw (`./tinyclaw/`): TS/Bash, check `.agents/skills/` directory

---

## Communication Channels

### 1. Telegram Bot

**What it does**: Easiest setup - just one token. Rich media support, inline buttons, file sharing. Great for teams.

**Reference implementations**: OpenClaw, NanoBot, PicoClaw, ZeroClaw, IronClaw, TinyClaw

**Where to find reference code**:
- OpenClaw (`./openclaw/`): TypeScript, check `skills/` and `extensions/` directories
- ZeroClaw (`./zeroclaw/`): Rust trait-based, check `src/tools/` directory
- NanoBot (`./nanobot/`): Python, check `nanobot/skills/` and `nanobot/agent/tools/`
- PicoClaw (`./picoclaw/`): Go, check `workspace/skills/` and `pkg/tools/`
- IronClaw (`./ironclaw/`): Rust + WASM, check `src/tools/builtin/` and `tools-src/`
- TinyClaw (`./tinyclaw/`): TS/Bash, check `.agents/skills/` directory

---

### 2. Voice Wake Word

**What it does**: Say "hey claude" and your AI listens. Always-on voice control like a smart speaker, but private.

**Reference implementations**: OpenClaw

**Where to find reference code**:
- OpenClaw (`./openclaw/`): TypeScript, check `skills/` and `extensions/` directories

---

## Memory & Knowledge

### 1. Document Knowledge Base

**What it does**: Upload PDFs, spreadsheets, documents. AI can search and analyze them. Your company's knowledge at its fingertips.

**Reference implementations**: Agent Zero, OpenClaw

**Where to find reference code**:
- OpenClaw (`./openclaw/`): TypeScript, check `skills/` and `extensions/` directories
- Agent Zero (`./agent-zero/`): Python, check `python/tools/` and `python/extensions/`

---

### 2. Session Auto-Compaction

**What it does**: When conversations get too long, automatically summarizes old parts to keep the AI fast while preserving key info.

**Reference implementations**: NanoClaw, IronClaw

**Where to find reference code**:
- NanoClaw (`./nanoclaw/`): TypeScript 5.2K lines, check `.claude/skills/` and `container/skills/`
- IronClaw (`./ironclaw/`): Rust + WASM, check `src/tools/builtin/` and `tools-src/`

---

## Automation & Scheduling

### 1. Browser Automation

**What it does**: AI controls a web browser: fills forms, clicks buttons, scrapes data, takes screenshots. Automates web-based work.

**Reference implementations**: OpenClaw, NanoClaw, Agent Zero, TinyClaw

**Where to find reference code**:
- OpenClaw (`./openclaw/`): TypeScript, check `skills/` and `extensions/` directories
- NanoClaw (`./nanoclaw/`): TypeScript 5.2K lines, check `.claude/skills/` and `container/skills/`
- TinyClaw (`./tinyclaw/`): TS/Bash, check `.agents/skills/` directory
- Agent Zero (`./agent-zero/`): Python, check `python/tools/` and `python/extensions/`

---

### 2. Heartbeat System

**What it does**: AI wakes up every 30 minutes to check if anything needs attention. Proactive, not just reactive.

**Reference implementations**: OpenClaw, PicoClaw, NanoBot, IronClaw, ZeroClaw

**Where to find reference code**:
- OpenClaw (`./openclaw/`): TypeScript, check `skills/` and `extensions/` directories
- ZeroClaw (`./zeroclaw/`): Rust trait-based, check `src/tools/` directory
- NanoBot (`./nanobot/`): Python, check `nanobot/skills/` and `nanobot/agent/tools/`
- PicoClaw (`./picoclaw/`): Go, check `workspace/skills/` and `pkg/tools/`
- IronClaw (`./ironclaw/`): Rust + WASM, check `src/tools/builtin/` and `tools-src/`

---

### 3. Cron Scheduling

**What it does**: Run tasks on a schedule: "every Monday 9am, send me a briefing." Works like a reliable alarm clock for your AI.

**Reference implementations**: OpenClaw, NanoClaw, NanoBot, PicoClaw, ZeroClaw, TinyClaw, IronClaw

**Where to find reference code**:
- OpenClaw (`./openclaw/`): TypeScript, check `skills/` and `extensions/` directories
- ZeroClaw (`./zeroclaw/`): Rust trait-based, check `src/tools/` directory
- NanoClaw (`./nanoclaw/`): TypeScript 5.2K lines, check `.claude/skills/` and `container/skills/`
- NanoBot (`./nanobot/`): Python, check `nanobot/skills/` and `nanobot/agent/tools/`
- PicoClaw (`./picoclaw/`): Go, check `workspace/skills/` and `pkg/tools/`
- IronClaw (`./ironclaw/`): Rust + WASM, check `src/tools/builtin/` and `tools-src/`
- TinyClaw (`./tinyclaw/`): TS/Bash, check `.agents/skills/` directory

---

### 4. Webhook Triggers

**What it does**: External services (Zapier, n8n, Shopify) can trigger your AI via URL. Connects to any automation ecosystem.

**Reference implementations**: OpenClaw, ZeroClaw, IronClaw

**Where to find reference code**:
- OpenClaw (`./openclaw/`): TypeScript, check `skills/` and `extensions/` directories
- ZeroClaw (`./zeroclaw/`): Rust trait-based, check `src/tools/` directory
- IronClaw (`./ironclaw/`): Rust + WASM, check `src/tools/builtin/` and `tools-src/`

---

### 5. Background Sub-Agents

**What it does**: Spawn helper AI workers for long tasks. Main agent stays responsive while workers handle heavy lifting in background.

**Reference implementations**: PicoClaw, NanoBot, Agent Zero, TinyClaw

**Where to find reference code**:
- NanoBot (`./nanobot/`): Python, check `nanobot/skills/` and `nanobot/agent/tools/`
- PicoClaw (`./picoclaw/`): Go, check `workspace/skills/` and `pkg/tools/`
- TinyClaw (`./tinyclaw/`): TS/Bash, check `.agents/skills/` directory
- Agent Zero (`./agent-zero/`): Python, check `python/tools/` and `python/extensions/`

---

### 6. Agent Team Collaboration

**What it does**: Multiple specialized agents (@coder, @reviewer, @writer) pass work to each other automatically. Like a small AI company.

**Reference implementations**: TinyClaw, NanoClaw, Agent Zero

**Where to find reference code**:
- NanoClaw (`./nanoclaw/`): TypeScript 5.2K lines, check `.claude/skills/` and `container/skills/`
- TinyClaw (`./tinyclaw/`): TS/Bash, check `.agents/skills/` directory
- Agent Zero (`./agent-zero/`): Python, check `python/tools/` and `python/extensions/`

---

## Integrations & Protocols

### 1. MCP Protocol

**What it does**: Universal standard for connecting AI to external tools. One protocol, thousands of integrations. The "USB" of AI tools.

**Reference implementations**: OpenClaw, NanoBot, IronClaw, Agent Zero

**Where to find reference code**:
- OpenClaw (`./openclaw/`): TypeScript, check `skills/` and `extensions/` directories
- NanoBot (`./nanobot/`): Python, check `nanobot/skills/` and `nanobot/agent/tools/`
- IronClaw (`./ironclaw/`): Rust + WASM, check `src/tools/builtin/` and `tools-src/`
- Agent Zero (`./agent-zero/`): Python, check `python/tools/` and `python/extensions/`

---

### 2. Skills System

**What it does**: Install new capabilities like apps on a phone. "Install weather skill" or "install GitHub skill." No coding needed.

**Reference implementations**: OpenClaw, PicoClaw, NanoClaw, Agent Zero, TinyClaw

**Where to find reference code**:
- OpenClaw (`./openclaw/`): TypeScript, check `skills/` and `extensions/` directories
- NanoClaw (`./nanoclaw/`): TypeScript 5.2K lines, check `.claude/skills/` and `container/skills/`
- PicoClaw (`./picoclaw/`): Go, check `workspace/skills/` and `pkg/tools/`
- TinyClaw (`./tinyclaw/`): TS/Bash, check `.agents/skills/` directory
- Agent Zero (`./agent-zero/`): Python, check `python/tools/` and `python/extensions/`

---

### 3. Plugin SDK

**What it does**: A developer kit for building new channels, tools, and memory backends. Create custom integrations for your specific business.

**Reference implementations**: OpenClaw, IronClaw

**Where to find reference code**:
- OpenClaw (`./openclaw/`): TypeScript, check `skills/` and `extensions/` directories
- IronClaw (`./ironclaw/`): Rust + WASM, check `src/tools/builtin/` and `tools-src/`

---

### 4. Multi-Provider Failover

**What it does**: If Claude goes down, automatically switch to GPT. If GPT is slow, try Gemini. Never lose service.

**Reference implementations**: IronClaw, OpenClaw, ZeroClaw

**Where to find reference code**:
- OpenClaw (`./openclaw/`): TypeScript, check `skills/` and `extensions/` directories
- ZeroClaw (`./zeroclaw/`): Rust trait-based, check `src/tools/` directory
- IronClaw (`./ironclaw/`): Rust + WASM, check `src/tools/builtin/` and `tools-src/`

---

### 5. Local LLM Support

**What it does**: Run AI models on your own computer. Zero API costs. Complete privacy. No internet needed.

**Reference implementations**: OpenClaw, ZeroClaw, PicoClaw, Agent Zero, NanoBot

**Where to find reference code**:
- OpenClaw (`./openclaw/`): TypeScript, check `skills/` and `extensions/` directories
- ZeroClaw (`./zeroclaw/`): Rust trait-based, check `src/tools/` directory
- NanoBot (`./nanobot/`): Python, check `nanobot/skills/` and `nanobot/agent/tools/`
- PicoClaw (`./picoclaw/`): Go, check `workspace/skills/` and `pkg/tools/`
- Agent Zero (`./agent-zero/`): Python, check `python/tools/` and `python/extensions/`

---

## Built-in Skills & Ready-Made Tools

### 1. Google Workspace Suite

**What it does**: Full Google Workspace integration: send emails, manage calendar, read/write docs, create spreadsheets, build presentations.

**Reference implementations**: OpenClaw, IronClaw

**Where to find reference code**:
- OpenClaw (`./openclaw/`): TypeScript, check `skills/` and `extensions/` directories
- IronClaw (`./ironclaw/`): Rust + WASM, check `src/tools/builtin/` and `tools-src/`

---

### 2. GitHub Integration Skill

**What it does**: Full GitHub workflow: manage issues, review pull requests, trigger CI runs, query the API. Code management from chat.

**Reference implementations**: OpenClaw, NanoBot, PicoClaw, IronClaw, ZeroClaw

**Where to find reference code**:
- OpenClaw (`./openclaw/`): TypeScript, check `skills/` and `extensions/` directories
- ZeroClaw (`./zeroclaw/`): Rust trait-based, check `src/tools/` directory
- NanoBot (`./nanobot/`): Python, check `nanobot/skills/` and `nanobot/agent/tools/`
- PicoClaw (`./picoclaw/`): Go, check `workspace/skills/` and `pkg/tools/`
- IronClaw (`./ironclaw/`): Rust + WASM, check `src/tools/builtin/` and `tools-src/`

---

### 3. PR Review/Prepare/Merge Workflow

**What it does**: Three-step pull request workflow: AI reviews code, prepares changes, and merges after validation. Full code review pipeline.

**Reference implementations**: OpenClaw

**Where to find reference code**:
- OpenClaw (`./openclaw/`): TypeScript, check `skills/` and `extensions/` directories

---

### 4. Whisper Speech-to-Text

**What it does**: Convert voice recordings to text. Works locally (no API key) or via OpenAI Whisper API.

**Reference implementations**: OpenClaw, NanoClaw

**Where to find reference code**:
- OpenClaw (`./openclaw/`): TypeScript, check `skills/` and `extensions/` directories
- NanoClaw (`./nanoclaw/`): TypeScript 5.2K lines, check `.claude/skills/` and `container/skills/`

---

### 5. Video Frame Extraction

**What it does**: Extract frames or short clips from videos using ffmpeg. AI can analyze video content.

**Reference implementations**: OpenClaw

**Where to find reference code**:
- OpenClaw (`./openclaw/`): TypeScript, check `skills/` and `extensions/` directories

---

### 6. Proactive User Messaging

**What it does**: AI sends messages to you without waiting for your prompt. Alerts, reminders, status updates pushed to your chat.

**Reference implementations**: TinyClaw, Agent Zero

**Where to find reference code**:
- TinyClaw (`./tinyclaw/`): TS/Bash, check `.agents/skills/` directory
- Agent Zero (`./agent-zero/`): Python, check `python/tools/` and `python/extensions/`

---

### 7. ElevenLabs Text-to-Speech

**What it does**: Convert text to natural speech. Cloud via ElevenLabs or offline via sherpa-onnx. Your AI talks back.

**Reference implementations**: OpenClaw

**Where to find reference code**:
- OpenClaw (`./openclaw/`): TypeScript, check `skills/` and `extensions/` directories

---

### 8. Image Generation

**What it does**: Generate images via OpenAI API or Google Gemini. Supports inpainting, masking, and batch generation.

**Reference implementations**: OpenClaw, TinyClaw

**Where to find reference code**:
- OpenClaw (`./openclaw/`): TypeScript, check `skills/` and `extensions/` directories
- TinyClaw (`./tinyclaw/`): TS/Bash, check `.agents/skills/` directory

---

### 9. URL/Video/Podcast Summarizer

**What it does**: Summarize web pages, YouTube videos, podcasts, and local files. Get the gist without reading/watching everything.

**Reference implementations**: OpenClaw, NanoBot, PicoClaw

**Where to find reference code**:
- OpenClaw (`./openclaw/`): TypeScript, check `skills/` and `extensions/` directories
- NanoBot (`./nanobot/`): Python, check `nanobot/skills/` and `nanobot/agent/tools/`
- PicoClaw (`./picoclaw/`): Go, check `workspace/skills/` and `pkg/tools/`

---

### 10. Blog/RSS Watcher

**What it does**: Monitor blogs and RSS/Atom feeds for new updates. Get notified when your favorite sources post.

**Reference implementations**: OpenClaw

**Where to find reference code**:
- OpenClaw (`./openclaw/`): TypeScript, check `skills/` and `extensions/` directories

---

### 11. Weather Skill

**What it does**: Get current weather and forecasts using free services. No API key required.

**Reference implementations**: OpenClaw, NanoBot, PicoClaw

**Where to find reference code**:
- OpenClaw (`./openclaw/`): TypeScript, check `skills/` and `extensions/` directories
- NanoBot (`./nanobot/`): Python, check `nanobot/skills/` and `nanobot/agent/tools/`
- PicoClaw (`./picoclaw/`): Go, check `workspace/skills/` and `pkg/tools/`

---

### 12. Document Query Tool

**What it does**: Upload documents and ask questions about them. AI extracts answers from your files.

**Reference implementations**: Agent Zero

**Where to find reference code**:
- Agent Zero (`./agent-zero/`): Python, check `python/tools/` and `python/extensions/`

---

### 13. Coding Agent Orchestration

**What it does**: Run Codex CLI, Claude Code, or other coding agents programmatically. AI manages AI coders.

**Reference implementations**: OpenClaw

**Where to find reference code**:
- OpenClaw (`./openclaw/`): TypeScript, check `skills/` and `extensions/` directories

---

### 14. Security Camera Snapshots

**What it does**: Capture frames and video clips from RTSP/ONVIF cameras. AI monitors your security feeds.

**Reference implementations**: OpenClaw

**Where to find reference code**:
- OpenClaw (`./openclaw/`): TypeScript, check `skills/` and `extensions/` directories

---

### 15. Screenshot & Vision Tools

**What it does**: Capture screenshots, read image metadata, and analyze visual content. AI can see your screen.

**Reference implementations**: ZeroClaw, Agent Zero

**Where to find reference code**:
- ZeroClaw (`./zeroclaw/`): Rust trait-based, check `src/tools/` directory
- Agent Zero (`./agent-zero/`): Python, check `python/tools/` and `python/extensions/`

---

### 16. Extension Marketplace

**What it does**: Browse, install, authenticate, and activate extensions from a marketplace. Expand your AI on-the-fly.

**Reference implementations**: IronClaw, OpenClaw

**Where to find reference code**:
- OpenClaw (`./openclaw/`): TypeScript, check `skills/` and `extensions/` directories
- IronClaw (`./ironclaw/`): Rust + WASM, check `src/tools/builtin/` and `tools-src/`

---

### 17. Skill Creator Tool

**What it does**: Framework for building and packaging new skills with scripts, references, and assets. Extend your AI's abilities.

**Reference implementations**: OpenClaw, NanoBot, PicoClaw, TinyClaw

**Where to find reference code**:
- OpenClaw (`./openclaw/`): TypeScript, check `skills/` and `extensions/` directories
- NanoBot (`./nanobot/`): Python, check `nanobot/skills/` and `nanobot/agent/tools/`
- PicoClaw (`./picoclaw/`): Go, check `workspace/skills/` and `pkg/tools/`
- TinyClaw (`./tinyclaw/`): TS/Bash, check `.agents/skills/` directory

---

### 18. Agent-to-Agent Communication

**What it does**: One Agent Zero instance talks to another. Distributed workflows across multiple isolated agents.

**Reference implementations**: Agent Zero

**Where to find reference code**:
- Agent Zero (`./agent-zero/`): Python, check `python/tools/` and `python/extensions/`

---

### 19. PDF Editor Skill

**What it does**: Edit PDFs by describing what you want changed. "Move the logo to the top right and change the date."

**Reference implementations**: OpenClaw

**Where to find reference code**:
- OpenClaw (`./openclaw/`): TypeScript, check `skills/` and `extensions/` directories

---

### 20. Mintlify Docs Builder

**What it does**: Build and maintain documentation websites from markdown files. AI writes your docs site.

**Reference implementations**: OpenClaw

**Where to find reference code**:
- OpenClaw (`./openclaw/`): TypeScript, check `skills/` and `extensions/` directories

---

### 21. 1Password Integration

**What it does**: Securely retrieve credentials and secrets from your 1Password vault via CLI.

**Reference implementations**: OpenClaw

**Where to find reference code**:
- OpenClaw (`./openclaw/`): TypeScript, check `skills/` and `extensions/` directories

---

## Architecture Patterns

### 1. Gateway WebSocket Hub

**What it does**: Central server that all channels connect to via real-time WebSockets. The "control tower" pattern.

**Reference implementations**: OpenClaw, IronClaw

**Where to find reference code**:
- OpenClaw (`./openclaw/`): TypeScript, check `skills/` and `extensions/` directories
- IronClaw (`./ironclaw/`): Rust + WASM, check `src/tools/builtin/` and `tools-src/`

---

### 2. Project Workspace Isolation

**What it does**: Separate workspaces per client/project. Each has its own memory, secrets, and instructions. No data mixing.

**Reference implementations**: Agent Zero, NanoClaw

**Where to find reference code**:
- NanoClaw (`./nanoclaw/`): TypeScript 5.2K lines, check `.claude/skills/` and `container/skills/`
- Agent Zero (`./agent-zero/`): Python, check `python/tools/` and `python/extensions/`

---

## Implementation Notes for Claude Code

When building this framework, follow these principles:

1. **Start with the reference code** - Each item above lists which repos implement it. Read those implementations first.
2. **Prefer simplicity** - If NanoClaw (5.2K lines) and OpenClaw (large) both implement a feature, start with NanoClaw's approach.
3. **Keep it modular** - Use ZeroClaw/IronClaw's trait-based pattern so components can be swapped later.
4. **Security by default** - Apply sandboxing, command blocklists, and pairing codes from the start.
5. **Full deep-dive reference** - See `FRAMEWORK-DEEP-DIVE.md` for complete architectural analysis of all 9 repos.

---

*Generated from the AI Agent Framework Grocery Store comparison tool.*
