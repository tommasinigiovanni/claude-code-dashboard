export function DocsPage() {
  return (
    <div className="p-6 max-w-3xl">
      <h2 className="text-2xl font-bold mb-6">Documentazione</h2>

      <div className="space-y-6">
        <section>
          <h3 className="text-lg font-semibold mb-2">MCP Servers</h3>
          <p className="text-sm text-muted-foreground">
            I Model Context Protocol (MCP) servers estendono le capacit&agrave; di Claude Code
            fornendo accesso a strumenti esterni, API e servizi. Puoi avere MCP locali
            (configurati nel tuo settings.json) e cloud connectors (gestiti da claude.ai).
          </p>
        </section>

        <section>
          <h3 className="text-lg font-semibold mb-2">Skills & Plugins</h3>
          <p className="text-sm text-muted-foreground">
            Le Skills sono istruzioni specializzate che guidano il comportamento di Claude Code
            per task specifici (es. TDD, debugging, code review). I Plugins sono pacchetti
            dal marketplace che aggiungono skills, agents e funzionalit&agrave;.
            Puoi attivarli/disattivarli con il toggle.
          </p>
        </section>

        <section>
          <h3 className="text-lg font-semibold mb-2">Sub-agents</h3>
          <p className="text-sm text-muted-foreground">
            I Sub-agents sono agenti specializzati che Claude Code pu&ograve; delegare per task
            complessi. Possono provenire da plugin o essere custom (file .md in ~/.claude/agents/).
            Quelli custom sono editabili ed eliminabili dalla dashboard.
          </p>
        </section>

        <section>
          <h3 className="text-lg font-semibold mb-2">Context Switcher</h3>
          <p className="text-sm text-muted-foreground">
            Il selettore in alto a destra permette di passare tra configurazione Global
            (~/.claude/settings.json) e Project-specific (.claude/settings.local.json).
            In modalit&agrave; Project, la dashboard mostra il merge delle due configurazioni
            con badge per indicare la provenienza di ogni elemento.
          </p>
        </section>

        <section>
          <h3 className="text-lg font-semibold mb-2">Launcher</h3>
          <p className="text-sm text-muted-foreground">
            Avvia Claude Code dal Launcher scegliendo tra terminale esterno (Terminal, iTerm2,
            Warp, etc.) o terminale integrato nell'app. Con tmux abilitato, le sessioni
            persistono anche chiudendo la dashboard.
          </p>
        </section>

        <section>
          <h3 className="text-lg font-semibold mb-2">File di configurazione</h3>
          <div className="text-sm text-muted-foreground space-y-1">
            <p><code className="bg-muted px-1.5 py-0.5 rounded text-xs">~/.claude/settings.json</code> — Configurazione globale</p>
            <p><code className="bg-muted px-1.5 py-0.5 rounded text-xs">project/.claude/settings.local.json</code> — Configurazione progetto</p>
            <p><code className="bg-muted px-1.5 py-0.5 rounded text-xs">~/.claude/agents/*.md</code> — Agents custom</p>
            <p><code className="bg-muted px-1.5 py-0.5 rounded text-xs">~/.claude/skills/*/SKILL.md</code> — Skills custom</p>
            <p><code className="bg-muted px-1.5 py-0.5 rounded text-xs">~/.claude/commands/*.md</code> — Comandi custom</p>
          </div>
        </section>
      </div>
    </div>
  )
}
