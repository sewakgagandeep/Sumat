# 🤖 Sumat — Personal AI Agent Framework

A modular, self-hosted AI agent framework for daily personal use. Cherry-picks the best patterns from OpenClaw, ZeroClaw, NanoBot, PicoClaw, TinyClaw, and Agent Zero.

## ✨ Features

| Category | Features |
|---|---|
| **LLM Providers** | Anthropic, OpenAI, OpenRouter, Gemini, GLM (z.ai), MiniMax, Ollama (local) — with automatic failover |
| **Channels** | Telegram Bot, Gateway WebSocket, REST API webhooks, CLI |
| **Agent Loop** | Multi-turn tool execution, auto-compaction, session persistence |
| **Tools** | Shell (sandboxed), file I/O, web search, web fetch — extensible registry |
| **Skills** | SKILL.md standard, auto-loading from workspace/bundled directories |
| **Memory** | Persistent (SQLite + file-based), searchable, category-based |
| **Security** | Approval gates (read/supervised/autonomous), command blocklist, workspace sandbox |
| **Automation** | SQLite-backed cron, heartbeat system, scheduled tasks |
| **Identity** | SOUL.md, IDENTITY.md, AGENTS.md, HEARTBEAT.md — workspace-based personality |
| **Deployment** | Docker, systemd, Ubuntu install script |

## 🚀 Quick Start

```bash
# Install
git clone https://github.com/your-repo/sumat.git && cd sumat
npm install

# Configure
npx tsx src/cli/index.ts onboard

# Verify
npx tsx src/cli/index.ts doctor

# Start
npx tsx src/cli/index.ts start
```

## 📋 CLI Commands

| Command | Description |
|---|---|
| `sumat start` | Start all services (gateway, Telegram, cron) |
| `sumat gateway` | Start only the Gateway WebSocket server |
| `sumat agent <message>` | One-shot chat from terminal |
| `sumat onboard` | Interactive setup wizard |
| `sumat status` | Show provider/session/cron status |
| `sumat doctor` | Diagnose common issues |
| `sumat cron list` | List scheduled jobs |
| `sumat cron add <name> <schedule> <message>` | Add a cron job |
| `sumat cron remove <id>` | Remove a cron job |

## 🏗️ Architecture

```
src/
├── config/         # Zod-validated config, env overrides, workspace init
├── providers/      # LLM providers (7 implementations + failover)
├── core/           # Agent loop, session, memory, context builder
├── tools/          # Tool registry + built-in tools (bash, files, web)
├── skills/         # Skill loader (SKILL.md standard)
├── channels/       # Telegram channel (grammY)
├── gateway/        # WebSocket + REST server
├── automation/     # Cron scheduler + heartbeat
├── bus/            # Typed event bus
├── utils/          # Logger, database, crypto, helpers
└── cli/            # Commander.js CLI
```

## ⚙️ Configuration

Sumat loads config from three layers (later overrides earlier):

1. **Defaults** — built-in sensible defaults
2. **Config file** — `~/.sumat/config.json`
3. **Environment variables** — `ANTHROPIC_API_KEY`, `TELEGRAM_BOT_TOKEN`, etc.

### Environment Variables

```bash
# LLM Providers (at least one required)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
OPENROUTER_API_KEY=sk-or-...
GEMINI_API_KEY=AI...
GLM_API_KEY=...
MINIMAX_API_KEY=...
OLLAMA_BASE_URL=http://localhost:11434

# Channels
TELEGRAM_BOT_TOKEN=...

# Gateway
SUMAT_GATEWAY_PORT=18789
```

## 🔐 Security

- **Approval Gates** — Tools are tagged `read` (auto), `supervised` (user confirms), or `autonomous`
- **Command Blocklist** — Dangerous commands (`rm -rf /`, `shutdown`, etc.) are blocked
- **Workspace Sandbox** — File operations restricted to `~/.sumat/workspace`
- **Pairing Codes** — Rate-limited access codes for new connections

## 🐳 Docker Deployment

```bash
cp .env.example .env
# Edit .env with your API keys
docker compose up -d
```

## 📦 Ubuntu Server Install

```bash
curl -sSL https://raw.githubusercontent.com/your-repo/sumat/main/install.sh | bash
sumat onboard
sudo systemctl enable --now sumat
```

## 🧠 Workspace Files

Located in `~/.sumat/workspace/`:

| File | Purpose |
|---|---|
| `SOUL.md` | Core personality and behavior |
| `IDENTITY.md` | Name, role, metadata |
| `AGENTS.md` | Agent behavior rules |
| `USER.md` | User preferences |
| `HEARTBEAT.md` | Periodic task instructions |
| `TOOLS.md` | Tool documentation |
| `RULES.md` | Dynamic behavior rules (optional) |

## License

MIT
