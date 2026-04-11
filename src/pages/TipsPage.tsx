import { useState } from 'react'
import { useI18n } from '@/i18n/useI18n'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  LightbulbIcon,
  SearchIcon,
  TerminalIcon,
  KeyboardIcon,
  FileTextIcon,
  ZapIcon,
  ShieldIcon,
  BotIcon,
  WrenchIcon,
  MessageSquareIcon,
} from 'lucide-react'

interface Tip {
  title: { it: string; en: string }
  description: { it: string; en: string }
  code?: string
  category: string
}

const CATEGORIES: Record<string, { label: { it: string; en: string }; icon: React.ReactNode }> = {
  shortcuts: { label: { it: 'Scorciatoie', en: 'Shortcuts' }, icon: <KeyboardIcon className="size-4" /> },
  prompting: { label: { it: 'Prompting', en: 'Prompting' }, icon: <MessageSquareIcon className="size-4" /> },
  commands: { label: { it: 'Comandi', en: 'Commands' }, icon: <TerminalIcon className="size-4" /> },
  claudemd: { label: { it: 'CLAUDE.md', en: 'CLAUDE.md' }, icon: <FileTextIcon className="size-4" /> },
  mcp: { label: { it: 'MCP & Tools', en: 'MCP & Tools' }, icon: <WrenchIcon className="size-4" /> },
  agents: { label: { it: 'Agents & Skills', en: 'Agents & Skills' }, icon: <BotIcon className="size-4" /> },
  performance: { label: { it: 'Performance', en: 'Performance' }, icon: <ZapIcon className="size-4" /> },
  security: { label: { it: 'Sicurezza', en: 'Security' }, icon: <ShieldIcon className="size-4" /> },
}

const TIPS: Tip[] = [
  // Shortcuts
  {
    title: { it: 'Escape per interrompere', en: 'Escape to interrupt' },
    description: { it: 'Premi Escape per fermare la generazione in corso. Premi Escape due volte per annullare completamente.', en: 'Press Escape to stop generation. Press Escape twice to cancel completely.' },
    category: 'shortcuts',
  },
  {
    title: { it: 'Tab per accettare', en: 'Tab to accept' },
    description: { it: 'Quando Claude propone una modifica, premi Tab per accettarla. Molto piu\' veloce di scrivere "yes".', en: 'When Claude proposes a change, press Tab to accept it. Much faster than typing "yes".' },
    category: 'shortcuts',
  },
  {
    title: { it: 'Ctrl+R per rieseguire', en: 'Ctrl+R to re-run' },
    description: { it: 'Riesegui l\'ultimo comando senza riscriverlo.', en: 'Re-run the last command without retyping it.' },
    category: 'shortcuts',
  },
  {
    title: { it: '# per aggiungere contesto', en: '# to add context' },
    description: { it: 'Scrivi # nel prompt per cercare e aggiungere file come contesto. Claude li leggera\' prima di rispondere.', en: 'Type # in the prompt to search and add files as context. Claude will read them before responding.' },
    category: 'shortcuts',
  },

  // Prompting
  {
    title: { it: 'Sii specifico con il contesto', en: 'Be specific with context' },
    description: { it: 'Invece di "fix the bug", dici "the login form submits twice when clicking the button fast — fix the double-submit in LoginForm.tsx". Piu\' contesto = risposte migliori.', en: 'Instead of "fix the bug", say "the login form submits twice when clicking the button fast — fix the double-submit in LoginForm.tsx". More context = better responses.' },
    category: 'prompting',
  },
  {
    title: { it: 'Chiedi di pianificare prima', en: 'Ask to plan first' },
    description: { it: 'Per task complessi, chiedi "plan how you would implement X, then wait for my approval before coding". Evita lavoro sprecato.', en: 'For complex tasks, ask "plan how you would implement X, then wait for my approval before coding". Avoids wasted work.' },
    category: 'prompting',
  },
  {
    title: { it: 'Usa immagini per il contesto', en: 'Use images for context' },
    description: { it: 'Puoi incollare screenshot direttamente nel prompt. Utile per bug visivi, mockup UI, o messaggi di errore.', en: 'You can paste screenshots directly into the prompt. Useful for visual bugs, UI mockups, or error messages.' },
    category: 'prompting',
  },
  {
    title: { it: 'Multi-turno per task grandi', en: 'Multi-turn for big tasks' },
    description: { it: 'Dividi task grandi in step. "First, create the database schema. Then, create the API endpoints. Then, create the tests." Ogni step puo\' essere verificato.', en: 'Break big tasks into steps. "First, create the database schema. Then, create the API endpoints. Then, create the tests." Each step can be verified.' },
    category: 'prompting',
  },

  // Commands
  {
    title: { it: '/help per tutti i comandi', en: '/help for all commands' },
    description: { it: 'Scrivi /help nel prompt per vedere tutti i comandi slash disponibili.', en: 'Type /help in the prompt to see all available slash commands.' },
    category: 'commands',
  },
  {
    title: { it: '/compact per risparmiare contesto', en: '/compact to save context' },
    description: { it: 'Quando la conversazione diventa lunga, usa /compact per riassumerla e liberare spazio nel contesto.', en: 'When the conversation gets long, use /compact to summarize and free context space.' },
    category: 'commands',
  },
  {
    title: { it: '/clear per ricominciare', en: '/clear to start fresh' },
    description: { it: 'Pulisce completamente la conversazione. Utile quando Claude sembra confuso o bloccato.', en: 'Completely clears the conversation. Useful when Claude seems confused or stuck.' },
    category: 'commands',
  },
  {
    title: { it: 'claude --print per risposte rapide', en: 'claude --print for quick answers' },
    description: { it: 'Usa claude --print "domanda" dalla shell per una risposta one-shot senza sessione interattiva.', en: 'Use claude --print "question" from the shell for a one-shot answer without interactive session.' },
    code: 'claude --print "what does the function foo() in main.rs do?"',
    category: 'commands',
  },
  {
    title: { it: 'Pipe input a Claude', en: 'Pipe input to Claude' },
    description: { it: 'Puoi fare pipe di file o output di comandi direttamente a Claude.', en: 'You can pipe files or command output directly to Claude.' },
    code: 'cat error.log | claude --print "explain this error"',
    category: 'commands',
  },

  // CLAUDE.md
  {
    title: { it: 'CLAUDE.md e\' il tuo copilota', en: 'CLAUDE.md is your copilot' },
    description: { it: 'Crea un file CLAUDE.md nella root del progetto con le convenzioni del team: stile di codice, architettura, testing. Claude lo legge automaticamente ad ogni sessione.', en: 'Create a CLAUDE.md file in the project root with team conventions: code style, architecture, testing. Claude reads it automatically at every session.' },
    category: 'claudemd',
  },
  {
    title: { it: 'CLAUDE.md globale', en: 'Global CLAUDE.md' },
    description: { it: 'Crea ~/.claude/CLAUDE.md per istruzioni che si applicano a TUTTI i tuoi progetti (es. "usa sempre TypeScript strict", "commit in inglese").', en: 'Create ~/.claude/CLAUDE.md for instructions that apply to ALL your projects (e.g., "always use TypeScript strict", "commit messages in English").' },
    category: 'claudemd',
  },
  {
    title: { it: 'Specifica cosa NON fare', en: 'Specify what NOT to do' },
    description: { it: 'Nel CLAUDE.md, le regole negative sono potenti: "Never modify files in /legacy/", "Don\'t add comments to obvious code", "Don\'t create new utility files without asking".', en: 'In CLAUDE.md, negative rules are powerful: "Never modify files in /legacy/", "Don\'t add comments to obvious code", "Don\'t create new utility files without asking".' },
    category: 'claudemd',
  },

  // MCP & Tools
  {
    title: { it: 'MCP estende le capacita\' di Claude', en: 'MCP extends Claude\'s capabilities' },
    description: { it: 'I server MCP danno a Claude accesso a tool esterni: database, API, browser, file system remoti. Aggiungili dalla pagina MCP Servers.', en: 'MCP servers give Claude access to external tools: databases, APIs, browsers, remote file systems. Add them from the MCP Servers page.' },
    category: 'mcp',
  },
  {
    title: { it: 'Health Check prima di lavorare', en: 'Health Check before working' },
    description: { it: 'Usa la pagina Health Check per verificare che tutti i server MCP siano connessi prima di iniziare una sessione di lavoro.', en: 'Use the Health Check page to verify all MCP servers are connected before starting a work session.' },
    category: 'mcp',
  },
  {
    title: { it: 'Brave Search per ricerche web', en: 'Brave Search for web searches' },
    description: { it: 'Aggiungi il server MCP di Brave Search per permettere a Claude di cercare sul web. Serve una API key gratuita da brave.com/search/api.', en: 'Add the Brave Search MCP server to let Claude search the web. Requires a free API key from brave.com/search/api.' },
    category: 'mcp',
  },

  // Agents & Skills
  {
    title: { it: 'Sub-agents per task specializzati', en: 'Sub-agents for specialized tasks' },
    description: { it: 'Crea sub-agent personalizzati per task ricorrenti: code reviewer, test writer, documentation generator. Dalla pagina Sub-agents.', en: 'Create custom sub-agents for recurring tasks: code reviewer, test writer, documentation generator. From the Sub-agents page.' },
    category: 'agents',
  },
  {
    title: { it: 'Skills dai plugin', en: 'Skills from plugins' },
    description: { it: 'I plugin della community aggiungono skills (prompt specializzati) che Claude puo\' usare. Esplora la pagina Skills & Plugins per vedere quelli disponibili.', en: 'Community plugins add skills (specialized prompts) that Claude can use. Explore the Skills & Plugins page to see what\'s available.' },
    category: 'agents',
  },

  // Performance
  {
    title: { it: 'tmux per sessioni persistenti', en: 'tmux for persistent sessions' },
    description: { it: 'Abilita tmux nelle Impostazioni per mantenere le sessioni Claude attive anche se chiudi il terminale. Puoi riattaccarti in qualsiasi momento.', en: 'Enable tmux in Settings to keep Claude sessions alive even if you close the terminal. You can reattach anytime.' },
    category: 'performance',
  },
  {
    title: { it: 'Sessioni multiple in parallelo', en: 'Multiple parallel sessions' },
    description: { it: 'Con tmux puoi avere piu\' sessioni Claude in parallelo, ognuna su un progetto diverso. Usa il Launcher per gestirle.', en: 'With tmux you can have multiple Claude sessions in parallel, each on a different project. Use the Launcher to manage them.' },
    category: 'performance',
  },
  {
    title: { it: 'Contesto di progetto vs globale', en: 'Project vs global context' },
    description: { it: 'Usa il Context Switcher nella TopBar per passare tra configurazione globale e di progetto. La configurazione di progetto sovrascrive quella globale.', en: 'Use the Context Switcher in the TopBar to switch between global and project configuration. Project config overrides global.' },
    category: 'performance',
  },

  // Security
  {
    title: { it: 'Rivedi sempre le modifiche', en: 'Always review changes' },
    description: { it: 'Claude chiede permesso prima di modificare file. Leggi attentamente cosa vuole fare prima di approvare, specialmente per operazioni distruttive.', en: 'Claude asks permission before modifying files. Read carefully what it wants to do before approving, especially for destructive operations.' },
    category: 'security',
  },
  {
    title: { it: 'Chat ID per il bot Telegram', en: 'Chat ID for Telegram bot' },
    description: { it: 'Configura il Chat ID nelle impostazioni Telegram per limitare l\'accesso al bot solo a te. Senza Chat ID, chiunque puo\' usarlo.', en: 'Configure the Chat ID in Telegram settings to limit bot access to you only. Without Chat ID, anyone can use it.' },
    category: 'security',
  },
  {
    title: { it: 'Backup automatici', en: 'Automatic backups' },
    description: { it: 'Il dashboard crea backup automatici della configurazione ad ogni avvio. Puoi ripristinarli dalla sezione Avanzate nelle Impostazioni.', en: 'The dashboard creates automatic configuration backups at every startup. You can restore them from the Advanced section in Settings.' },
    category: 'security',
  },
]

export function TipsPage() {
  const { locale } = useI18n()
  const isIt = locale === 'it'
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const query = search.toLowerCase()
  const filtered = TIPS.filter((tip) => {
    const matchesSearch = !query
      || tip.title[locale].toLowerCase().includes(query)
      || tip.description[locale].toLowerCase().includes(query)
      || (tip.code && tip.code.toLowerCase().includes(query))
    const matchesCategory = !activeCategory || tip.category === activeCategory
    return matchesSearch && matchesCategory
  })

  const grouped = new Map<string, Tip[]>()
  for (const tip of filtered) {
    const list = grouped.get(tip.category) || []
    list.push(tip)
    grouped.set(tip.category, list)
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-bold">Tips & Tricks</h2>
        <Badge variant="secondary" className="text-xs">{filtered.length} tips</Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        {isIt
          ? 'Suggerimenti per usare Claude Code al meglio.'
          : 'Tips to get the most out of Claude Code.'}
      </p>

      {/* Search + Category filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isIt ? 'Cerca tips...' : 'Search tips...'}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              !activeCategory ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {isIt ? 'Tutti' : 'All'}
          </button>
          {Object.entries(CATEGORIES).map(([key, cat]) => (
            <button
              key={key}
              onClick={() => setActiveCategory(activeCategory === key ? null : key)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                activeCategory === key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {cat.label[locale]}
            </button>
          ))}
        </div>
      </div>

      {/* Tips grouped by category */}
      {Array.from(grouped.entries()).map(([category, tips]) => (
        <div key={category} className="rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3 p-4">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              {CATEGORIES[category]?.icon}
            </div>
            <div>
              <h3 className="text-sm font-semibold">{CATEGORIES[category]?.label[locale]}</h3>
              <p className="text-xs text-muted-foreground">{tips.length} tip{tips.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <Separator />
          <div className="p-4 space-y-3">
            {tips.map((tip, i) => (
              <div key={i} className="rounded-lg bg-muted/30 p-3 space-y-1.5">
                <div className="flex items-start gap-2">
                  <LightbulbIcon className="size-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{tip.title[locale]}</p>
                    <p className="text-xs text-muted-foreground mt-1">{tip.description[locale]}</p>
                    {tip.code && (
                      <code className="block mt-2 text-xs bg-background rounded px-2 py-1.5 font-mono overflow-x-auto">
                        {tip.code}
                      </code>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <SearchIcon className="size-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">{isIt ? 'Nessun tip trovato' : 'No tips found'}</p>
        </div>
      )}
    </div>
  )
}
