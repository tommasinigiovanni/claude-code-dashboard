# Changelog

All notable changes to Claude Code Dashboard will be documented in this file.

## [0.6.0] - 2026-04-04

### Added
- **Profiles** — Save/load named configuration profiles
- **Session Log Viewer** — Browse Claude Code session logs
- **MCP Health Check** — Verify MCP server connection status
- **Import/Export** — Export/import full config as JSON
- **Onboarding Wizard** — Guided first-launch experience
- **Barlow font** — Professional typography throughout
- **Lucide icons** — SVG icons replacing emoji in sidebar
- **Auto-start Telegram bot** on app launch if configured
- **GFM tables** — Proper markdown table rendering in docs and chat
- **Comprehensive documentation** — 9 sections, fully bilingual IT/EN

### Changed
- Sidebar reorganized: Launcher first, then core management, then tools
- App icon updated with "CCD" branding
- Sidebar header: centered app icon with full name below
- Version bumped from 0.5.0 to 0.6.0

### Fixed
- Health check MCP no longer hangs (reads init event, then kills process)
- Markdown tables now render properly (added remark-gfm)

## [0.5.0] - 2026-04-04

### Added
- **PTY-based Chat** — Interactive chat with permission approval buttons
- **Telegram Bot** — Control Claude Code from mobile with inline buttons, session memory, /sessions, /switch, /new commands
- **tmux Split Panes** — Claude Code on top, shell on bottom with themed panels
- **Command Palette** (Cmd+K) — Quick navigation and tmux session switching
- **Image upload** in chat — drag & drop, paste, file picker
- **Chat history** — Persistent per-project in localStorage
- **i18n** — Full Italian/English localization across all pages
- **System Tray** — Background operation with tray icon
- **Context Switcher** — Recent projects from Claude Code session history
- **Plugin toggle** — Enable/disable marketplace plugins
- **Custom agents** — Edit/delete user agent .md files
- **Project-local skills** — Read skills from project .claude/ directory
- **Collapsible sidebar** — Minimize to icon-only mode
- **Copyable path** — Click path badge to copy
- **Terminal choice** — Terminal, iTerm2, Warp, Alacritty, embedded, or chat
- **Dark/Light/System theme**
- **Documentation page** with full feature guide
- **Credits page** with developer info and tech stack

## [0.1.0] - 2026-04-02

### Added
- Initial MVP — Milestones M0 through M8
- **MCP Manager** — View cloud connectors, CRUD local MCP servers
- **Skills Viewer** — Browse plugins, skills, custom commands
- **Sub-agents Manager** — View and manage agents from plugins and config
- **Launcher** — Check Claude installation, launch in external terminal
- **Settings** — Theme, terminal choice, Claude path override
- **Tauri 2** desktop app with React + TypeScript + Rust
- **Zustand** state management
- **shadcn/ui** components with Tailwind CSS v4
- Reading from `~/.claude/settings.json` (not claude.json)
- Atomic writes with backup (.bak) for all config changes
