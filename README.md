# Claude Code Dashboard

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Tauri](https://img.shields.io/badge/Tauri%202-Ready-FFC131?logo=tauri&logoColor=white)](https://tauri.app/)
[![Made with AI](https://img.shields.io/badge/Made%20with-Claude%20Code%20%E2%9D%A4%EF%B8%8F-ff69b4)](https://claude.ai/code)
[![Giovanni Tommasini](https://img.shields.io/badge/Giovanni%20Tommasini-CTO%20%26%20Developer-blue)](https://giovannitommasini.it/)

**Claude Code Dashboard** is a desktop GUI for managing your Claude Code environment: MCP servers, Skills, Plugins, Sub-agents, and project configurations.

## Why this project?

Claude Code has quickly become the most powerful AI coding assistant available — but it's a terminal-based tool. For developers, that's natural. For everyone else — content creators, project managers, marketers, entrepreneurs — the terminal is a wall.

Claude Code can do incredible things beyond coding: write editorial plans, manage emails, search the web, analyze documents, automate workflows. But none of that matters if people can't get past the terminal prompt.

**Claude Code Dashboard breaks that wall.** It wraps Claude Code in a familiar, visual interface:

- A **chat mode** that feels like WhatsApp — type a message, get a response, no terminal knowledge needed
- **Permission approval buttons** — when Claude wants to edit a file, you tap Approve or Reject
- **Mobile control via Telegram** — manage Claude Code from your phone
- A full **dashboard** for developers to manage MCP servers, plugins, agents, and configurations

The goal is simple: make Claude Code accessible to everyone, not just developers.

## Features

### Core Dashboard
- **MCP Manager** - View cloud connectors (claude.ai) and manage local MCP servers (CRUD)
- **Skills & Plugins** - Browse installed plugins with enable/disable toggle, view skills from plugins, custom skills, and project-local skills
- **Sub-agents** - View plugin agents, edit custom user agents (.md files), manage config-based agents
- **Context Switcher** - Switch between Global and Project scope with recent projects from Claude session history

### Launcher & Terminal
- **Chat Mode** - Chat-like interface for non-technical users with Markdown rendering, image upload, and persistent history
- **Embedded Terminal** - Full xterm.js terminal with tmux support for persistent sessions
- **tmux Split Panes** - Claude Code on top, shell on bottom, with visual separator and mouse resize
- **External Terminals** - Support for Terminal, iTerm2, Warp, Alacritty, or custom
- **Permission Approval** - PTY-based chat forwards Claude's permission requests as Approve/Reject buttons

### Mobile Control
- **Telegram Bot** - Control Claude Code from your phone with inline keyboard buttons
- **Session Memory** - Telegram conversations maintain context across messages
- **Session Switching** - `/sessions`, `/switch`, `/new` commands with tappable buttons

### Extra
- **Cmd+K Command Palette** - Quick navigation and tmux session switching
- **i18n** - Full Italian/English localization
- **System Tray** - Background operation with tray icon
- **Dark/Light/System theme**

## Stack tecnologico

| Layer | Technology |
|-------|-----------|
| Desktop Framework | **Tauri 2** (Rust + WebView) |
| Frontend | **React 18 + TypeScript** |
| UI Components | **shadcn/ui** (base-ui) |
| Styling | **Tailwind CSS v4** |
| State Management | **Zustand** |
| Terminal | **xterm.js + portable-pty** |
| Build | **Vite** |

## Quick start

```bash
# Prerequisites
# - Rust (rustup)
# - Node.js >= 18
# - Claude Code installed (npm install -g @anthropic-ai/claude-code)

# Clone
git clone https://github.com/tommasinigiovanni/ClaudeCodeDashboard.git
cd ClaudeCodeDashboard

# Install dependencies
npm install

# Dev mode
npm run tauri dev

# Production build
npm run tauri build
```

## Configuration files

| File | Description |
|------|-----------|
| `~/.claude/settings.json` | Global configuration |
| `project/.claude/settings.local.json` | Project configuration |
| `~/.claude/agents/*.md` | Custom agents |
| `~/.claude/skills/*/SKILL.md` | Custom skills |
| `~/.claude/commands/*.md` | Custom slash commands |
| `~/.claude/plugins/` | Installed plugins |

## Telegram Bot Setup

1. Create a bot with [@BotFather](https://t.me/BotFather) on Telegram
2. Copy the bot token
3. Go to **Settings** in the dashboard, paste the token
4. Click **Start Telegram bot**
5. Send `/chatid` to your bot to get your Chat ID (optional, for security)
6. Start chatting with Claude Code from your phone!

Commands: `/menu`, `/sessions`, `/switch <project>`, `/new`, `/help`

## Documentation

Full documentation is available in the app under the **Documentation** page, in both Italian and English.

| File | Content |
|------|---------|
| [`PRD.md`](PRD.md) | Product requirements |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Technical architecture |
| [`DATA_MODEL.md`](DATA_MODEL.md) | Data model and config structure |
| [`TASKS.md`](TASKS.md) | Development task breakdown |

---

## License

MIT - Use, modify and share freely!

---

Made with love by [Giovanni Tommasini](https://giovannitommasini.it/) in pair programming with [Claude Code](https://claude.ai/code) (Opus 4.6)
