import ReactMarkdown from 'react-markdown'
import { useI18n } from '@/i18n/useI18n'

const docs = {
  it: [
    {
      title: 'Guida rapida',
      content: `### Primo avvio

1. **Seleziona un progetto** — usa il Context Switcher in alto a destra per scegliere un progetto dai recenti o selezionarne uno nuovo
2. **Vai al Launcher** — clicca su Launcher nella sidebar
3. **Avvia Claude Code** — scegli tra Chat (per un'esperienza semplice) o Terminale (per utenti esperti)

### Per utenti non tecnici

La modalità **Chat** è pensata per te. Vai in **Impostazioni → Terminale → Chat**, poi apri il Launcher e clicca "Avvia Claude Code". Vedrai un'interfaccia familiare dove puoi:

- **Scrivere messaggi** come in una chat normale
- **Allegare immagini** trascinandole o con Cmd+V
- **Vedere le risposte** formattate in modo leggibile
- **Mantenere la cronologia** delle conversazioni

Claude Code ha accesso ai file del progetto, può cercare informazioni online, inviare email, gestire calendario e molto altro grazie agli MCP connectors.

### Per sviluppatori

La modalità **Terminale** ti dà accesso diretto a Claude Code con:

- **tmux** — abilita nelle Impostazioni per sessioni persistenti che sopravvivono alla chiusura dell'app
- **Cmd+K** — Command Palette per navigare rapidamente tra pagine e sessioni tmux
- **Tab sessioni** — switcha tra più sessioni tmux attive dalla barra in alto

### Gestire la configurazione

- **MCP Servers** — aggiungi server MCP locali per estendere le capacità di Claude (database, API, filesystem)
- **Skills & Plugins** — attiva/disattiva plugins dal marketplace, visualizza le skills disponibili
- **Sub-agents** — visualizza e gestisci gli agents specializzati, modifica quelli custom

### Consigli

- Usa il **Context Switcher** per passare rapidamente tra progetti — ogni progetto ha la sua configurazione
- Il badge **Global/Project** su ogni elemento ti dice da dove proviene la configurazione
- Clicca sul **path** nella barra del terminale/chat per copiarlo
- Il pulsante **📂** apre la cartella di una skill/plugin nel Finder`,
    },
    {
      title: 'MCP Servers',
      content: `I Model Context Protocol (MCP) servers estendono le capacità di Claude Code fornendo accesso a strumenti esterni, API e servizi.

**Cloud Connectors** — gestiti da claude.ai (Gmail, Slack, Notion, etc.). Visibili ma non configurabili dalla dashboard.

**MCP Locali** — configurati nel tuo settings.json. Puoi aggiungerli, modificarli e rimuoverli dalla dashboard.`,
    },
    {
      title: 'Skills & Plugins',
      content: `Le **Skills** sono istruzioni specializzate che guidano Claude Code per task specifici (TDD, debugging, code review, etc.).

I **Plugins** sono pacchetti dal marketplace che aggiungono skills, agents e funzionalità. Puoi attivarli/disattivarli con il toggle.

**Fonti delle skills:**
- Plugin installati (~/.claude/plugins/)
- Skills custom (~/.claude/skills/*/SKILL.md)
- Comandi custom (~/.claude/commands/*.md)
- Skills di progetto (project/.claude/skills/)`,
    },
    {
      title: 'Sub-agents',
      content: `I Sub-agents sono agenti specializzati che Claude Code può delegare per task complessi.

**User Agents** — file .md in ~/.claude/agents/. Editabili e eliminabili dalla dashboard.

**Plugin Agents** — forniti dai plugin installati. Read-only.

**Agents da Configurazione** — definiti nel settings.json. CRUD completo dalla dashboard.`,
    },
    {
      title: 'Context Switcher',
      content: `Il selettore in alto a destra permette di passare tra:

**Globale** — ~/.claude/settings.json
**Progetto** — project/.claude/settings.local.json

I **progetti recenti** vengono letti dalla history delle sessioni Claude Code. In modalità Project, la dashboard mostra il merge delle configurazioni con badge per indicare la provenienza.`,
    },
    {
      title: 'Launcher & Terminale',
      content: `Avvia Claude Code scegliendo tra:

**Chat** — interfaccia chat per utenti non tecnici con rendering Markdown, upload immagini e history persistente.

**Terminale integrato** — xterm.js con supporto tmux per sessioni persistenti.

**Terminale esterno** — Terminal, iTerm2, Warp, Alacritty o custom.

Con **tmux** abilitato, le sessioni persistono anche chiudendo la dashboard. Puoi switchare tra sessioni con le tab o con Cmd+K.`,
    },
    {
      title: 'Scorciatoie',
      content: `**Cmd+K** — Command Palette per navigazione rapida e switch sessioni tmux.

**Click sul path** — copia il percorso negli appunti.

**📂 su skill/plugin** — apre la cartella nel Finder.`,
    },
    {
      title: 'File di configurazione',
      content: `\`~/.claude/settings.json\` — Configurazione globale
\`project/.claude/settings.local.json\` — Configurazione progetto
\`~/.claude/agents/*.md\` — Agents custom
\`~/.claude/skills/*/SKILL.md\` — Skills custom
\`~/.claude/commands/*.md\` — Comandi custom (slash commands)
\`~/.claude/plugins/\` — Plugins installati`,
    },
  ],
  en: [
    {
      title: 'Quick Start',
      content: `### First launch

1. **Select a project** — use the Context Switcher in the top right to choose from recent projects or select a new one
2. **Go to Launcher** — click Launcher in the sidebar
3. **Start Claude Code** — choose between Chat (simple experience) or Terminal (for power users)

### For non-technical users

**Chat** mode is designed for you. Go to **Settings → Terminal → Chat**, then open the Launcher and click "Launch Claude Code". You'll see a familiar interface where you can:

- **Write messages** like in a normal chat
- **Attach images** by dragging them or with Cmd+V
- **See responses** formatted in a readable way
- **Keep conversation history** across sessions

Claude Code has access to your project files, can search the web, send emails, manage your calendar and much more thanks to MCP connectors.

### For developers

**Terminal** mode gives you direct access to Claude Code with:

- **tmux** — enable in Settings for persistent sessions that survive app closure
- **Cmd+K** — Command Palette for quick navigation between pages and tmux sessions
- **Session tabs** — switch between active tmux sessions from the top bar

### Managing configuration

- **MCP Servers** — add local MCP servers to extend Claude's capabilities (databases, APIs, filesystem)
- **Skills & Plugins** — enable/disable marketplace plugins, view available skills
- **Sub-agents** — view and manage specialized agents, edit custom ones

### Tips

- Use the **Context Switcher** to quickly switch between projects — each project has its own configuration
- The **Global/Project** badge on each item tells you where the configuration comes from
- Click on the **path** in the terminal/chat bar to copy it
- The **📂** button opens a skill/plugin folder in Finder`,
    },
    {
      title: 'MCP Servers',
      content: `Model Context Protocol (MCP) servers extend Claude Code's capabilities by providing access to external tools, APIs and services.

**Cloud Connectors** — managed by claude.ai (Gmail, Slack, Notion, etc.). Visible but not configurable from the dashboard.

**Local MCP** — configured in your settings.json. You can add, edit and remove them from the dashboard.`,
    },
    {
      title: 'Skills & Plugins',
      content: `**Skills** are specialized instructions that guide Claude Code for specific tasks (TDD, debugging, code review, etc.).

**Plugins** are marketplace packages that add skills, agents and features. You can enable/disable them with the toggle.

**Skill sources:**
- Installed plugins (~/.claude/plugins/)
- Custom skills (~/.claude/skills/*/SKILL.md)
- Custom commands (~/.claude/commands/*.md)
- Project skills (project/.claude/skills/)`,
    },
    {
      title: 'Sub-agents',
      content: `Sub-agents are specialized agents that Claude Code can delegate complex tasks to.

**User Agents** — .md files in ~/.claude/agents/. Editable and deletable from the dashboard.

**Plugin Agents** — provided by installed plugins. Read-only.

**Configuration Agents** — defined in settings.json. Full CRUD from the dashboard.`,
    },
    {
      title: 'Context Switcher',
      content: `The selector in the top right allows switching between:

**Global** — ~/.claude/settings.json
**Project** — project/.claude/settings.local.json

**Recent projects** are read from Claude Code session history. In Project mode, the dashboard shows merged configurations with badges indicating the source.`,
    },
    {
      title: 'Launcher & Terminal',
      content: `Launch Claude Code choosing from:

**Chat** — chat interface for non-technical users with Markdown rendering, image upload and persistent history.

**Embedded terminal** — xterm.js with tmux support for persistent sessions.

**External terminal** — Terminal, iTerm2, Warp, Alacritty or custom.

With **tmux** enabled, sessions persist even after closing the dashboard. Switch between sessions with tabs or Cmd+K.`,
    },
    {
      title: 'Shortcuts',
      content: `**Cmd+K** — Command Palette for quick navigation and tmux session switching.

**Click on path** — copies the path to clipboard.

**📂 on skill/plugin** — opens the folder in Finder.`,
    },
    {
      title: 'Configuration files',
      content: `\`~/.claude/settings.json\` — Global configuration
\`project/.claude/settings.local.json\` — Project configuration
\`~/.claude/agents/*.md\` — Custom agents
\`~/.claude/skills/*/SKILL.md\` — Custom skills
\`~/.claude/commands/*.md\` — Custom commands (slash commands)
\`~/.claude/plugins/\` — Installed plugins`,
    },
  ],
}

export function DocsPage() {
  const { locale } = useI18n()
  const sections = docs[locale]

  return (
    <div className="p-6 max-w-3xl">
      <h2 className="text-2xl font-bold mb-6">{locale === 'it' ? 'Documentazione' : 'Documentation'}</h2>
      <div className="space-y-6">
        {sections.map((section, i) => (
          <section key={i}>
            <h3 className="text-lg font-semibold mb-2">{section.title}</h3>
            <div className="text-sm text-muted-foreground prose prose-invert prose-sm max-w-none [&_p]:my-2 [&_ul]:my-1 [&_li]:my-0.5 [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs">
              <ReactMarkdown>{section.content}</ReactMarkdown>
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
