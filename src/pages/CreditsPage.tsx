import { useI18n } from '@/i18n/useI18n'

export function CreditsPage() {
  const { locale } = useI18n()
  const isIt = locale === 'it'

  return (
    <div className="p-6 max-w-3xl">
      <h2 className="text-2xl font-bold mb-6">Credits</h2>

      <div className="rounded-lg border border-border p-6 mb-6">
        <h3 className="text-lg font-semibold mb-1">Claude Code Dashboard</h3>
        <p className="text-sm text-muted-foreground mb-4">v0.7.0</p>
        <p className="text-sm text-muted-foreground">
          {isIt
            ? "Una GUI desktop per gestire l'ambiente di Claude Code: MCP servers, Skills, Sub-agents e configurazioni di progetto."
            : 'A desktop GUI for managing the Claude Code environment: MCP servers, Skills, Sub-agents and project configurations.'}
        </p>
      </div>

      <div className="rounded-lg border border-border p-6 mb-6">
        <h3 className="text-lg font-semibold mb-1">Giovanni Tommasini</h3>
        <p className="text-sm text-muted-foreground mb-3">
          {isIt
            ? 'Telco DevOps Expert & CTO — Ideatore e sviluppatore del progetto.'
            : 'Telco DevOps Expert & CTO — Creator and developer of the project.'}
        </p>
        <p className="text-sm text-muted-foreground mb-4">
          {isIt
            ? 'CTO di AI Fabric, co-fondatore di evoseed. 25+ anni di esperienza ICT/Telco. Appassionato di DevOps, automazione e intelligenza artificiale.'
            : 'CTO of AI Fabric, co-founder of evoseed. 25+ years of ICT/Telco experience. Passionate about DevOps, automation and artificial intelligence.'}
        </p>
        <div className="flex flex-wrap gap-3">
          <a href="https://giovannitommasini.it" target="_blank" rel="noopener"
            className="text-xs text-primary hover:underline">giovannitommasini.it</a>
          <a href="https://github.com/tommasinigiovanni" target="_blank" rel="noopener"
            className="text-xs text-primary hover:underline">GitHub</a>
          <a href="https://linkedin.com/in/giovannitommasini" target="_blank" rel="noopener"
            className="text-xs text-primary hover:underline">LinkedIn</a>
          <a href="https://x.com/GioviTommasini" target="_blank" rel="noopener"
            className="text-xs text-primary hover:underline">X/Twitter</a>
          <a href="https://bsky.app/profile/giovannitommasini.it" target="_blank" rel="noopener"
            className="text-xs text-primary hover:underline">Bluesky</a>
          <a href="https://blog.gt0.dev" target="_blank" rel="noopener"
            className="text-xs text-primary hover:underline">Blog</a>
        </div>
      </div>

      <div className="rounded-lg border border-border p-6 mb-6">
        <h3 className="text-lg font-semibold mb-3">{isIt ? 'Sviluppato con' : 'Built with'}</h3>
        <div className="text-sm text-muted-foreground space-y-2">
          <p><span className="font-medium text-foreground">Claude Code</span> — Anthropic's CLI for Claude (Opus 4.6)</p>
          <p><span className="font-medium text-foreground">Tauri 2</span> — {isIt ? 'Framework desktop cross-platform' : 'Cross-platform desktop framework'}</p>
          <p><span className="font-medium text-foreground">React + TypeScript</span> — Frontend</p>
          <p><span className="font-medium text-foreground">Rust</span> — {isIt ? 'Backend nativo' : 'Native backend'}</p>
          <p><span className="font-medium text-foreground">shadcn/ui</span> — {isIt ? 'Componenti UI' : 'UI Components'}</p>
          <p><span className="font-medium text-foreground">Tailwind CSS v4</span> — Styling</p>
          <p><span className="font-medium text-foreground">Zustand</span> — State management</p>
          <p><span className="font-medium text-foreground">xterm.js</span> — {isIt ? 'Terminale integrato' : 'Embedded terminal'}</p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {isIt
          ? 'Interamente progettato e sviluppato in pair programming con Claude Code.'
          : 'Entirely designed and developed in pair programming with Claude Code.'}
      </p>
    </div>
  )
}
