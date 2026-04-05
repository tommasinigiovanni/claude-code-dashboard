import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useI18n } from '@/i18n/useI18n'

const changelog = `
## v1.1.0 — 2026-04-06

**Security, Quality & Backup System**

- 🔒 **Security** — SSH path escaping, StrictHostKeyChecking=accept-new, Telegram chat_id warning
- 🐛 **Bug fixes** — Profile dates, Rust warnings (0!), unwrap safety, tmux project path
- 🏗️ **Code quality** — config.rs split, shared hooks, DRY refactoring
- ⚡ **Performance** — Event-driven TopBar, reduced polling
- ⌨️ **Cmd+1..8** — Keyboard shortcuts for page navigation
- 🔔 **Desktop notifications** — Alert when chat response arrives
- 💾 **Auto-save chat** on window close
- 🟢 **Session indicator** — Green dot when tmux active
- 📦 **Backup system** — Auto-backup on start, manual backup, restore, list
- 🎨 **UX redesign** — Stats bars, search, filters, card layouts on all pages

---

## v1.0.0 — 2026-04-05 🎉

**First Stable Release!**

Everything is production-ready. All features polished and tested:

- 🔌 **MCP Manager** — Cloud + local with search and stats bar
- ⚡ **Skills & Plugins** — Filter tabs, toggle, search
- 🤖 **Sub-agents** — Collapsible sections, search, edit .md files
- 🚀 **Launcher** — Chat, terminal, tmux split, external terminals
- 💬 **Chat Mode** — PTY-based with permission Approve/Reject
- 📱 **Telegram Bot** — Inline buttons, session memory, auto-start
- 🖥️ **SSH Remote** — Full remote VM support
- 📋 **Profiles** — Save/load with confirm dialogs
- 📜 **Session Logs** — Type filters, relative timestamps
- 🏥 **Health Check** — Auto-refresh, stats summary
- 📦 **Import/Export** — Full config transfer
- 👋 **Onboarding Wizard**
- ⌨️ **Cmd+K** — Command Palette
- 🌐 **i18n IT/EN** — Fully bilingual
- 🎨 **UX Redesign** — Card-based, Lucide icons, Barlow font

---

## v0.7.0 — 2026-04-05

**SSH Remote VM Support**
- SSH profiles, remote data loading, remote tmux, remote health check

---

## v0.6.0 — 2026-04-04

**New features:**
- 📋 **Profiles** — Save and load named configuration sets
- 📜 **Session Log Viewer** — Browse Claude Code conversation logs
- 🏥 **MCP Health Check** — Verify server connection status with green/red indicators
- 📦 **Import/Export** — Transfer your entire config as JSON
- 👋 **Onboarding Wizard** — Guided setup for new users
- 🔤 **Barlow font** — Professional typography
- ✨ **Lucide SVG icons** — Clean icons replacing emoji in sidebar
- 🤖 **Auto-start Telegram bot** — Starts automatically if configured
- 📊 **GFM tables** — Proper table rendering in docs and chat

**Improvements:**
- Sidebar reorganized: Launcher first, grouped sections with separators
- App icon updated with CCD branding
- Centered sidebar header with app icon
- Comprehensive bilingual documentation (9 sections)

**Fixes:**
- Health check no longer hangs
- Markdown tables render correctly

---

## v0.5.0 — 2026-04-04

**Major features:**
- 💬 **PTY-based Chat** — Interactive chat with Approve/Reject permission buttons
- 📱 **Telegram Bot** — Full mobile control with inline buttons, session memory
- 🖥️ **tmux Split Panes** — Claude on top + shell below
- ⌨️ **Cmd+K Command Palette** — Quick navigation
- 🖼️ **Image upload** in chat — drag, paste, or pick
- 🌐 **i18n IT/EN** — Full localization
- 🔔 **System Tray** — Background operation
- 🔄 **Context Switcher** — Recent projects from session history
- 📂 **Plugin toggle** — Enable/disable plugins
- ✏️ **Custom agents editor** — Edit .md files from dashboard

---

## v0.4.0 — 2026-04-03

**Chat & Telegram:**
- 💬 **PTY-based Chat** — Interactive chat with Approve/Reject permission buttons
- 📱 **Telegram Bot** — Mobile control with inline keyboard buttons
- 🔐 **Permission forwarding** — Claude's tool requests shown as buttons in chat
- 🖼️ **Image upload** — Drag & drop, paste, file picker in chat
- 💾 **Chat history** — Persistent per-project in localStorage
- 🤖 **Telegram session memory** — Context maintained across messages
- 📋 **Telegram commands** — /sessions, /switch, /new, /help with tappable buttons

---

## v0.3.0 — 2026-04-03

**Terminal & tmux:**
- 🖥️ **Embedded Terminal** — Full xterm.js terminal inside the app
- 📺 **tmux split panes** — Claude Code on top (70%), shell below (30%)
- 🖱️ **Mouse resize** — Drag border between panes
- 🎨 **Themed panes** — Purple border, green-on-black retro shell
- 📑 **Session tabs** — Switch between active tmux sessions
- ⌨️ **Cmd+K Command Palette** — Quick navigation and session switching

---

## v0.2.0 — 2026-04-02

**Configuration & Context:**
- ☁️ **Cloud MCP connectors** — Read from claude.ai (Gmail, Slack, etc.)
- 🔌 **Plugin toggle** — Enable/disable marketplace plugins
- ⚡ **Custom skills** — Read from ~/.claude/skills/ and ~/.claude/commands/
- 🤖 **Custom agents** — Read/edit/delete from ~/.claude/agents/
- 📁 **Project-local skills** — Read from project/.claude/skills/
- 🔄 **Context Switcher** — Global/Project with recent projects
- 🌐 **i18n IT/EN** — Full localization across all pages
- 🌙 **Dark/Light/System** theme support
- 🔔 **System Tray** — Background operation with tray icon

---

## v0.1.0 — 2026-04-02

**Initial MVP — Milestones M0-M8:**
- 🔌 MCP Manager (view cloud connectors + CRUD local servers)
- ⚡ Skills & Plugins Viewer
- 🤖 Sub-agents Manager
- 🚀 Quick Launcher (check installation, launch in terminal)
- ⚙️ Settings (theme, terminal choice, Claude path override)
- Tauri 2 desktop app (Rust + React + TypeScript)
- shadcn/ui components + Tailwind CSS v4
- Zustand state management
- Atomic config writes with backup (.bak)
`

export function ChangelogPage() {
  const { locale } = useI18n()

  return (
    <div className="p-6 max-w-3xl">
      <h2 className="text-2xl font-bold mb-2">Changelog</h2>
      <p className="text-sm text-muted-foreground mb-6">
        {locale === 'it' ? 'Cronologia delle versioni e modifiche.' : 'Version history and changes.'}
      </p>
      <div className="prose prose-invert prose-sm max-w-none [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-0 [&_h2]:mb-3 [&_hr]:my-6 [&_hr]:border-border [&_strong]:text-foreground [&_li]:my-0.5 [&_ul]:my-2 [&_p]:my-2">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{changelog}</ReactMarkdown>
      </div>
    </div>
  )
}
