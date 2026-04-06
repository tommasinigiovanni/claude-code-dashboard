# Changelog

All notable changes to Claude Code Dashboard will be documented in this file.

## [1.2.0] - 2026-04-06

### Added
- **Hooks Manager** — Visual editor for Claude Code hooks with templates
- **Cost & Usage Tracker** — Token usage and cost per project/day with charts
- **CLAUDE.md Editor** — View/Edit toggle with markdown rendering + templates
- **Verification Loop** — Run tests via `claude --print`, pass/fail history, stats
- **Memories Viewer** — Browse Claude Code memories across all projects
- **Font zoom** — Cmd+/- to increase/decrease, Cmd+0 to reset

### Fixed
- Usage reads tokens from assistant messages (not just result entries)
- Cost estimation based on Opus pricing

## [1.1.0] - 2026-04-06

### Security
- SSH path injection: escape single quotes in all remote paths
- Changed `StrictHostKeyChecking` from `no` to `accept-new` (MITM protection)
- Telegram warning when bot running without chat_id

### Bug Fixes
- Profile dates: handle both seconds and milliseconds timestamps
- Fixed unsafe `unwrap()` calls in telegram.rs
- Removed unused `install_plugin` function
- Resolved all 9 Rust compiler warnings (0 warnings now)
- Local tmux sessions now open in project directory (not home)

### Code Quality
- Split `config.rs` (819 lines) into `types.rs` + `readers.rs` + `config.rs`
- Created shared `useSshConfig` hook (eliminated 4+ duplications)
- Replaced 8 inline `localStorage` reads with centralized `getSettings()`
- Event-driven settings updates (custom `settings-changed` event)

### Performance
- TopBar: event-driven instead of 1-second polling
- TmuxSessionTabs: reduced polling from 3s to 10s

### UX Improvements
- **Cmd+1..8** keyboard shortcuts for page navigation
- **Desktop notifications** when chat response completes (window hidden)
- **Auto-save chat** on window close (beforeunload)
- **Session indicator** — green dot on Launcher when tmux sessions active
- **Backup management UI** — list, restore, delete backups in Settings
- **UX redesign** of all pages: stats bars, search, filters, card layouts

### New Features
- **Automatic backup** on app startup (~/.claude/dashboard-backups/)
- **Manual backup** button in Settings
- **Restore backup** with pre-restore safety copy
- **Backup rotation** — keeps last 7, auto-deletes older
- **Backup list** with timestamp, size, restore/delete actions

## [1.0.0] - 2026-04-05 — First Stable Release 🎉

### Highlights
This is the first production-ready release of Claude Code Dashboard — a desktop GUI
that makes Claude Code accessible to everyone, not just developers.

### All Features
- **MCP Manager** — Cloud connectors + local MCP CRUD with search and stats
- **Skills & Plugins** — Toggle plugins, browse skills with filter tabs
- **Sub-agents** — User/Plugin/Config agents with search and collapsible sections
- **Launcher** — Chat mode, embedded terminal, external terminals, tmux split
- **Chat Mode** — PTY-based chat with permission Approve/Reject buttons
- **Telegram Bot** — Mobile control with inline buttons, session memory, auto-start
- **SSH Remote** — Connect to VMs, full remote data loading, remote tmux
- **Profiles** — Save/load named configuration sets with confirm dialogs
- **Session Logs** — Browse logs with type filters and relative timestamps
- **Health Check** — MCP status with auto-refresh and summary stats
- **Import/Export** — Transfer full config as JSON
- **Onboarding Wizard** — Guided first-launch setup
- **Cmd+K** — Command Palette for quick navigation
- **Context Switcher** — Global/Project with recent projects (local + remote)
- **i18n IT/EN** — Full bilingual localization
- **Dark/Light/System** themes
- **System Tray** — Background operation
- **Barlow font + Lucide icons** — Professional UI
- **Card-based Settings** — Collapsible sections
- **Documentation** — 9 sections with GFM tables, fully bilingual
- **Changelog** — In-app + CHANGELOG.md

### Technical
- Tauri 2 (Rust + React + TypeScript)
- shadcn/ui (base-ui) + Tailwind CSS v4
- Zustand state management
- xterm.js + portable-pty for terminal
- remark-gfm for markdown rendering

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
- **Configuration Profiles** — Save/load named configuration sets
- **Session Log Viewer** — Browse Claude Code session logs
- **MCP Health Check** — Verify MCP server connection status
- **Import/Export** — Export/import full config as JSON
- **Onboarding Wizard** — Guided first-launch experience

## [0.4.0] - 2026-04-03

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

## [0.3.0] - 2026-04-03

### Added
- **Embedded Terminal** — Full xterm.js terminal inside the app
- **tmux split panes** — Claude Code on top, shell below
- **Mouse resize** between panes
- **Themed panes** — Purple border, green-on-black shell
- **Session tabs** — Switch between active tmux sessions
- **Cmd+K Command Palette** — Quick navigation and session switching

## [0.2.0] - 2026-04-02

### Added
- **Cloud MCP connectors** — Read from claude.ai
- **Plugin toggle** — Enable/disable marketplace plugins
- **Custom skills** — Read from ~/.claude/skills/ and commands/
- **Custom agents** — Read/edit/delete from ~/.claude/agents/
- **Project-local skills** — Read from project/.claude/skills/
- **Context Switcher** — Global/Project with recent projects
- **i18n IT/EN** — Full localization
- **Dark/Light/System** theme
- **System Tray** — Background operation

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
