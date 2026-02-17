# 🤖 Sumat — Personal AI Agent Framework

> **A modular, self-hosted AI agent framework for daily personal use.**  
> Cherry-picks the best patterns from OpenClaw, ZeroClaw, NanoBot, and Agent Zero.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)

**Repository**: [https://github.com/sewakgagandeep/Sumat](https://github.com/sewakgagandeep/Sumat)

---

## ✨ Features

- **🧠 Model Agnostic**: Supports Anthropic, OpenAI, Gemini, DeepSeek (via OpenRouter), GLM, MiniMax, and localized Ollama models.
- **🛡️ Secure by Design**: Sandboxed execution, command blocklists, and approval gates for sensitive actions.
- **🔌 Skill-Based**: Extensible `SKILL.md` system. Comes with **20+ built-in skills**.
- **💾 Persistent Memory**: SQLite-backed semantic memory & conversation history.
- **🗣️ Multi-Modal**: Voice (Whisper/ElevenLabs), Vision (GPT-4o/Gemini), and Image Generation.
- **⚡ Proactive**: Cron-based scheduling and background task execution.
- **🌐 Gateway**: WebSocket/REST API for remote control via Telegram or Web UI.

---

## 🛠️ Built-in Skills

Sumat comes pre-loaded with a powerful suite of tools:

| Category | Skills |
|---|---|
| **Core** | `bash` (sandboxed), `browser` (Puppeteer), `coding-agent` |
| **Productivity** | `google-workspace` (Docs/Sheets/Calendar/Gmail), `email` (SMTP/IMAP) |
| **DevOps** | `github` (Issues/PRs), `pr-review`, `secrets-manager` (1Password) |
| **Content** | `docs-builder` (Markdown→HTML), `image-generation` (Dall-E/Stability), `video-analysis` (FFmpeg) |
| **Information** | `google-search`, `knowledge-base` (RAG), `rss-watcher`, `url-summarizer`, `weather`, `pdf-tools` |
| **System** | `voice` (STT/TTS), `hot-vision` (Screen analysis), `skill-creator` (Self-extension) |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Docker (optional, for containerized run)
- API Keys (Anthropic, OpenAI, etc.)

### Installation

```bash
# Clone the repository
git clone https://github.com/sewakgagandeep/Sumat.git
cd Sumat

# Install dependencies
npm install

# Setup configuration
npx tsx src/cli/index.ts onboard
# (Follow the interactive wizard)
```

### Running Sumat

```bash
# Start the full agent system
npm run start

# OR run in development mode
npm run dev
```

### Docker Deployment

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env with your keys

# 2. Start container
docker-compose up -d
```

---

## 💻 CLI Commands

| Command | Description |
|---|---|
| `sumat start` | Start Gateway, Agent Loop, and Cron Scheduler |
| `sumat doctor` | Diagnose configuration and dependency issues |
| `sumat status` | Show provider status and usage stats |
| `sumat agent "msg"` | Send a one-off instruction to the agent |
| `sumat cron list` | View scheduled background tasks |

---

## 🏗️ Architecture

```
src/
├── core/           # Agent Loop, Memory, Context
├── skills/         # Skill Loader & Registry
├── tools/          # Tool Definitions (Zod schemas)
├── gateway/        # API & WebSocket Server
├── providers/      # LLM Vendor Implementations
└── automation/     # Cron & Event Bus
```

## 🤝 Contributing

Contributions are welcome! Please read `CONTRIBUTING.md` (if available) or submit a Pull Request.

## 📄 License

MIT © [Gagandeep Singh](https://github.com/sewakgagandeep)
