import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useI18n } from '@/i18n/useI18n'
import { Separator } from '@/components/ui/separator'

const docs = {
  it: {
    title: 'Documentazione',
    sections: [
      {
        icon: '🚀',
        title: 'Guida rapida',
        content: `### Primo avvio

Al primo avvio vedrai un **wizard di benvenuto** che ti guiderà nella configurazione. Se l'hai già completato, ecco i passi essenziali:

| Passo | Azione |
|-------|--------|
| 1 | **Seleziona un progetto** dal Context Switcher (in alto a destra) |
| 2 | Vai al **Launcher** nella sidebar |
| 3 | Clicca **Avvia Claude Code** |

### Per utenti non tecnici

La modalità **Chat** è pensata per te. Vai in **Impostazioni → Terminale → Chat**, poi:

- Scrivi messaggi come in una **chat normale**
- **Allega immagini** trascinandole o con Cmd+V
- Quando Claude vuole modificare qualcosa, vedrai un pulsante **Approva/Rifiuta**
- La **cronologia** si mantiene tra le sessioni

> Claude Code ha accesso ai file del progetto, può cercare online, inviare email, gestire calendario e molto altro grazie agli MCP connectors.

### Per sviluppatori

La modalità **Terminale** ti dà accesso diretto con:

- **tmux** — abilita nelle Impostazioni per sessioni persistenti (Claude sopra, shell sotto)
- **Cmd+K** — Command Palette per navigare e switchare sessioni
- **Tab sessioni** — switcha tra sessioni tmux dalla barra in alto`,
      },
      {
        icon: '🔌',
        title: 'MCP Servers',
        content: `I **Model Context Protocol** (MCP) servers estendono le capacità di Claude Code dandogli accesso a strumenti esterni.

### Cloud Connectors
Gestiti da **claude.ai** — Gmail, Slack, Notion, Google Calendar, etc. La dashboard li mostra con stato di connessione ma non possono essere configurati localmente.

### MCP Locali
Configurati nel tuo \`settings.json\`. Dalla dashboard puoi:

| Azione | Come |
|--------|------|
| **Aggiungere** | Pulsante "+ Aggiungi MCP" → form con nome, comando, argomenti, env |
| **Modificare** | Menu ⋯ → Modifica |
| **Eliminare** | Menu ⋯ → Elimina |

Ogni MCP mostra un badge **Global** o **Project** per indicare la provenienza.`,
      },
      {
        icon: '⚡',
        title: 'Skills & Plugins',
        content: `### Plugins
I plugins sono pacchetti dal marketplace che aggiungono funzionalità. Puoi **attivarli/disattivarli** con il toggle.

### Skills
Le skills sono istruzioni specializzate per task specifici. Provengono da 4 fonti:

| Fonte | Path | Tipo |
|-------|------|------|
| Plugin installati | \`~/.claude/plugins/\` | Plugin |
| Skills custom | \`~/.claude/skills/*/SKILL.md\` | Custom |
| Comandi custom | \`~/.claude/commands/*.md\` | Command |
| Skills di progetto | \`project/.claude/skills/\` | Project |

Il pulsante **📂** apre la cartella della skill nel Finder.`,
      },
      {
        icon: '🤖',
        title: 'Sub-agents',
        content: `I sub-agents sono agenti specializzati che Claude può delegare per task complessi.

### User Agents (editabili)
File \`.md\` in \`~/.claude/agents/\`. Dalla dashboard puoi **modificare** il contenuto del file e **eliminare** agents. Supporta sottocartelle per organizzazione.

### Plugin Agents (read-only)
Forniti dai plugin installati — code-reviewer, knowledge-graph-guide, etc.

### Agents da Configurazione
Definiti nel \`settings.json\` → sezione \`agents\`. CRUD completo dalla dashboard.`,
      },
      {
        icon: '🔄',
        title: 'Context Switcher',
        content: `Il selettore in alto a destra gestisce il contesto attivo:

| Modalità | File | Descrizione |
|----------|------|-------------|
| **Globale** | \`~/.claude/settings.json\` | Configurazione condivisa |
| **Progetto** | \`project/.claude/settings.local.json\` | Override per progetto |

### Progetti recenti
La lista viene letta dalla **history delle sessioni** Claude Code (\`~/.claude/projects/\`). Ogni progetto mostra le ultime 2 parti del path. Hover per il path completo, click per switchare.

In modalità **Project**, la dashboard mostra il **merge** delle configurazioni con badge per indicare la provenienza di ogni elemento.`,
      },
      {
        icon: '💬',
        title: 'Chat & Terminale',
        content: `### Modalità Chat
Interfaccia conversazionale basata su PTY interattivo:

- Messaggi formattati in **Markdown** con bolle user/assistant
- **Upload immagini** — drag & drop, Cmd+V, o pulsante 📎
- **Approvazione permessi** — quando Claude vuole editare/scrivere, compare un pulsante Approva/Rifiuta
- **Cronologia persistente** — salvata per progetto in localStorage

### Terminale Integrato
Terminale xterm.js completo con:

- **tmux split** — Claude Code sopra (70%), shell sotto (30%)
- **Mouse resize** — trascina il bordo tra i pannelli
- **Tab sessioni** — switcha tra sessioni tmux attive
- Temi diversi per i due pannelli (viola per il bordo, verde su nero per la shell)

### Terminale Esterno
Supporto per: Terminal, iTerm2, Warp, Alacritty, o percorso custom.`,
      },
      {
        icon: '📱',
        title: 'Telegram Bot',
        content: `Controlla Claude Code dal telefono via Telegram.

### Setup
1. Crea un bot con **@BotFather** → copia il token
2. Incolla nei **Settings** → sezione Telegram
3. Clicca **Avvia bot**
4. Manda \`/chatid\` al bot per ottenere il tuo ID (opzionale per sicurezza)

### Comandi

| Comando | Descrizione |
|---------|-------------|
| \`/menu\` | Menu principale con bottoni |
| \`/sessions\` | Lista sessioni tmux (tappabili) |
| \`/switch <nome>\` | Cambia progetto attivo |
| \`/new\` | Nuova conversazione |
| \`/help\` | Lista comandi |

> I comandi sono anche disponibili dal **menu hamburger** di Telegram (bottone / in basso a sinistra).

Claude **ricorda il contesto** tra messaggi nella stessa conversazione. Usa \`/new\` per ricominciare.`,
      },
      {
        icon: '⌨️',
        title: 'Scorciatoie',
        content: `| Scorciatoia | Azione |
|-------------|--------|
| **Cmd+K** | Command Palette — cerca pagine e sessioni tmux |
| **Click sul path** | Copia il percorso negli appunti |
| **📂 su skill/plugin** | Apre la cartella nel Finder |
| **Enter** | Invia messaggio nella chat |
| **Shift+Enter** | Nuova riga nella chat |
| **Cmd+V** | Incolla immagine nella chat |`,
      },
      {
        icon: '📋',
        title: 'Profili & Import/Export',
        content: `### Profili
Salva la configurazione attuale come **profilo nominato** per riutilizzarla:

- "Modalità Scrittura" — solo MCP per ricerca e docs
- "Modalità DevOps" — MCP per infra, database, CI/CD
- "Modalità Presentazione" — configurazione minimale

### Import/Export
Nella pagina **Settings** puoi:

- **Esportare** tutta la configurazione (settings, agents, skills, commands) come JSON
- **Importare** un file JSON — merge intelligente che non sovrascrive le configurazioni esistenti`,
      },
      {
        icon: '📁',
        title: 'File di configurazione',
        content: `| File | Descrizione |
|------|-------------|
| \`~/.claude/settings.json\` | Configurazione globale |
| \`project/.claude/settings.local.json\` | Configurazione progetto |
| \`~/.claude/agents/*.md\` | Agents custom (editabili) |
| \`~/.claude/skills/*/SKILL.md\` | Skills custom |
| \`~/.claude/commands/*.md\` | Comandi slash custom |
| \`~/.claude/plugins/\` | Plugins installati |
| \`~/.claude/projects/\` | History sessioni per progetto |
| \`~/.claude/dashboard-profiles/\` | Profili salvati |`,
      },
    ],
  },
  en: {
    title: 'Documentation',
    sections: [
      {
        icon: '🚀',
        title: 'Quick Start',
        content: `### First launch

On first launch you'll see a **welcome wizard** that guides you through setup. If you've already completed it, here are the essential steps:

| Step | Action |
|------|--------|
| 1 | **Select a project** from the Context Switcher (top right) |
| 2 | Go to **Launcher** in the sidebar |
| 3 | Click **Launch Claude Code** |

### For non-technical users

**Chat** mode is designed for you. Go to **Settings → Terminal → Chat**, then:

- Write messages like in a **normal chat**
- **Attach images** by dragging or with Cmd+V
- When Claude wants to modify something, you'll see an **Approve/Reject** button
- **History** persists across sessions

> Claude Code can access project files, search online, send emails, manage your calendar and much more thanks to MCP connectors.

### For developers

**Terminal** mode gives you direct access with:

- **tmux** — enable in Settings for persistent sessions (Claude on top, shell below)
- **Cmd+K** — Command Palette for navigation and session switching
- **Session tabs** — switch between tmux sessions from the top bar`,
      },
      {
        icon: '🔌',
        title: 'MCP Servers',
        content: `**Model Context Protocol** (MCP) servers extend Claude Code's capabilities by providing access to external tools.

### Cloud Connectors
Managed by **claude.ai** — Gmail, Slack, Notion, Google Calendar, etc. The dashboard shows them with connection status but they cannot be configured locally.

### Local MCP
Configured in your \`settings.json\`. From the dashboard you can:

| Action | How |
|--------|-----|
| **Add** | "+ Add MCP" button → form with name, command, args, env |
| **Edit** | Menu ⋯ → Edit |
| **Delete** | Menu ⋯ → Delete |

Each MCP shows a **Global** or **Project** badge to indicate its source.`,
      },
      {
        icon: '⚡',
        title: 'Skills & Plugins',
        content: `### Plugins
Plugins are marketplace packages that add features. You can **enable/disable** them with the toggle.

### Skills
Skills are specialized instructions for specific tasks. They come from 4 sources:

| Source | Path | Type |
|--------|------|------|
| Installed plugins | \`~/.claude/plugins/\` | Plugin |
| Custom skills | \`~/.claude/skills/*/SKILL.md\` | Custom |
| Custom commands | \`~/.claude/commands/*.md\` | Command |
| Project skills | \`project/.claude/skills/\` | Project |

The **📂** button opens the skill's folder in Finder.`,
      },
      {
        icon: '🤖',
        title: 'Sub-agents',
        content: `Sub-agents are specialized agents that Claude can delegate complex tasks to.

### User Agents (editable)
\`.md\` files in \`~/.claude/agents/\`. From the dashboard you can **edit** file contents and **delete** agents. Supports subfolders for organization.

### Plugin Agents (read-only)
Provided by installed plugins — code-reviewer, knowledge-graph-guide, etc.

### Configuration Agents
Defined in \`settings.json\` → \`agents\` section. Full CRUD from the dashboard.`,
      },
      {
        icon: '🔄',
        title: 'Context Switcher',
        content: `The selector in the top right manages the active context:

| Mode | File | Description |
|------|------|-------------|
| **Global** | \`~/.claude/settings.json\` | Shared configuration |
| **Project** | \`project/.claude/settings.local.json\` | Per-project override |

### Recent projects
The list is read from Claude Code **session history** (\`~/.claude/projects/\`). Each project shows the last 2 path parts. Hover for full path, click to switch.

In **Project** mode, the dashboard shows the **merged** configurations with badges indicating each item's source.`,
      },
      {
        icon: '💬',
        title: 'Chat & Terminal',
        content: `### Chat Mode
Conversational interface based on interactive PTY:

- Messages formatted in **Markdown** with user/assistant bubbles
- **Image upload** — drag & drop, Cmd+V, or 📎 button
- **Permission approval** — when Claude wants to edit/write, an Approve/Reject button appears
- **Persistent history** — saved per project in localStorage

### Embedded Terminal
Full xterm.js terminal with:

- **tmux split** — Claude Code on top (70%), shell below (30%)
- **Mouse resize** — drag the border between panels
- **Session tabs** — switch between active tmux sessions
- Different themes for the two panels (purple border, green-on-black shell)

### External Terminal
Support for: Terminal, iTerm2, Warp, Alacritty, or custom path.`,
      },
      {
        icon: '📱',
        title: 'Telegram Bot',
        content: `Control Claude Code from your phone via Telegram.

### Setup
1. Create a bot with **@BotFather** → copy the token
2. Paste in **Settings** → Telegram section
3. Click **Start bot**
4. Send \`/chatid\` to the bot to get your ID (optional for security)

### Commands

| Command | Description |
|---------|-------------|
| \`/menu\` | Main menu with buttons |
| \`/sessions\` | Active tmux sessions (tappable) |
| \`/switch <name>\` | Switch active project |
| \`/new\` | New conversation |
| \`/help\` | List commands |

> Commands are also available from Telegram's **menu button** (/ button at bottom left).

Claude **remembers context** between messages in the same conversation. Use \`/new\` to start fresh.`,
      },
      {
        icon: '⌨️',
        title: 'Shortcuts',
        content: `| Shortcut | Action |
|----------|--------|
| **Cmd+K** | Command Palette — search pages and tmux sessions |
| **Click on path** | Copy path to clipboard |
| **📂 on skill/plugin** | Open folder in Finder |
| **Enter** | Send message in chat |
| **Shift+Enter** | New line in chat |
| **Cmd+V** | Paste image in chat |`,
      },
      {
        icon: '📋',
        title: 'Profiles & Import/Export',
        content: `### Profiles
Save your current configuration as a **named profile** for reuse:

- "Writing Mode" — only research and docs MCP
- "DevOps Mode" — infra, database, CI/CD MCP
- "Presentation Mode" — minimal configuration

### Import/Export
In the **Settings** page you can:

- **Export** your entire configuration (settings, agents, skills, commands) as JSON
- **Import** a JSON file — smart merge that doesn't overwrite existing configs`,
      },
      {
        icon: '📁',
        title: 'Configuration Files',
        content: `| File | Description |
|------|-------------|
| \`~/.claude/settings.json\` | Global configuration |
| \`project/.claude/settings.local.json\` | Project configuration |
| \`~/.claude/agents/*.md\` | Custom agents (editable) |
| \`~/.claude/skills/*/SKILL.md\` | Custom skills |
| \`~/.claude/commands/*.md\` | Custom slash commands |
| \`~/.claude/plugins/\` | Installed plugins |
| \`~/.claude/projects/\` | Session history per project |
| \`~/.claude/dashboard-profiles/\` | Saved profiles |`,
      },
    ],
  },
}

export function DocsPage() {
  const { locale } = useI18n()
  const { title, sections } = docs[locale]

  return (
    <div className="p-6 max-w-4xl">
      <h2 className="text-2xl font-bold mb-8">{title}</h2>
      <div className="space-y-8">
        {sections.map((section, i) => (
          <section key={i}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{section.icon}</span>
              <h3 className="text-xl font-bold">{section.title}</h3>
            </div>
            <div className="pl-11 prose prose-invert prose-sm max-w-none [&_table]:w-full [&_th]:text-left [&_th]:py-2 [&_th]:px-3 [&_th]:bg-muted/50 [&_th]:font-medium [&_th]:text-xs [&_th]:uppercase [&_th]:tracking-wider [&_td]:py-2 [&_td]:px-3 [&_td]:border-b [&_td]:border-border [&_tr]:border-b [&_tr]:border-border [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_blockquote]:border-l-primary [&_blockquote]:bg-primary/5 [&_blockquote]:py-2 [&_blockquote]:px-4 [&_blockquote]:rounded-r-lg [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5 [&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-base [&_table]:my-3">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.content}</ReactMarkdown>
            </div>
            {i < sections.length - 1 && <Separator className="mt-8" />}
          </section>
        ))}
      </div>
    </div>
  )
}
