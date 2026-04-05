import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useI18n } from '@/i18n/useI18n'

const changelog = `
## v0.7.0 — 2026-04-05

**Major: SSH Remote VM Support**
- 🖥️ **SSH Connection** — Connect to remote VMs where Claude Code is installed
- All data reads from remote: MCP, Skills, Plugins, Sub-agents, tmux sessions
- Remote folder picker with autocomplete from recent projects
- Health check runs on remote VM
- Launcher shows remote tmux sessions and recent projects
- SSH profile management in Settings (add, test, delete, switch)
- Seamless switching between Local and Remote mode

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

## v0.1.0 — 2026-04-02

**Initial MVP — All milestones M0-M8:**
- MCP Manager (cloud connectors + local CRUD)
- Skills & Plugins Viewer
- Sub-agents Manager
- Quick Launcher
- Settings (theme, terminal, path override)
- Tauri 2 + React + TypeScript + Rust
- shadcn/ui + Tailwind CSS v4 + Zustand
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
