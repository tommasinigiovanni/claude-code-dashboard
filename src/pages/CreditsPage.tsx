import { useI18n } from '@/i18n/useI18n'
import { Separator } from '@/components/ui/separator'
import {
  InfoIcon, UserIcon, CodeIcon,
  GlobeIcon, BookOpenIcon,
  CloudIcon,
} from 'lucide-react'

export function CreditsPage() {
  const { t, locale } = useI18n()
  const isIt = locale === 'it'

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      <h2 className="text-2xl font-bold">{t('credits.title')}</h2>

      {/* App info card */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center gap-3 p-4">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <InfoIcon className="size-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold">Claude Code Dashboard</h3>
            <p className="text-xs text-muted-foreground mt-0.5">v1.0.0</p>
          </div>
        </div>
        <Separator />
        <div className="p-4">
          <p className="text-sm text-muted-foreground">
            {isIt
              ? "Una GUI desktop per gestire l'ambiente di Claude Code: MCP servers, Skills, Sub-agents e configurazioni di progetto."
              : 'A desktop GUI for managing the Claude Code environment: MCP servers, Skills, Sub-agents and project configurations.'}
          </p>
        </div>
      </div>

      {/* Author card */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center gap-3 p-4">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <UserIcon className="size-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold">Giovanni Tommasini</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isIt
                ? 'Telco DevOps Expert & CTO — Ideatore e sviluppatore del progetto.'
                : 'Telco DevOps Expert & CTO — Creator and developer of the project.'}
            </p>
          </div>
        </div>
        <Separator />
        <div className="p-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            {isIt
              ? 'CTO di AI Fabric, co-fondatore di evoseed. 25+ anni di esperienza ICT/Telco. Appassionato di DevOps, automazione e intelligenza artificiale.'
              : 'CTO of AI Fabric, co-founder of evoseed. 25+ years of ICT/Telco experience. Passionate about DevOps, automation and artificial intelligence.'}
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { href: 'https://giovannitommasini.it', icon: <GlobeIcon className="size-3" />, label: 'giovannitommasini.it' },
              { href: 'https://github.com/tommasinigiovanni', icon: <CodeIcon className="size-3" />, label: 'GitHub' },
              { href: 'https://linkedin.com/in/giovannitommasini', icon: <GlobeIcon className="size-3" />, label: 'LinkedIn' },
              { href: 'https://x.com/GioviTommasini', icon: <GlobeIcon className="size-3" />, label: 'X/Twitter' },
              { href: 'https://bsky.app/profile/giovannitommasini.it', icon: <CloudIcon className="size-3" />, label: 'Bluesky' },
              { href: 'https://blog.gt0.dev', icon: <BookOpenIcon className="size-3" />, label: 'Blog' },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 py-1 text-xs text-primary hover:bg-accent transition-colors"
              >
                {link.icon}
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Built with card */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center gap-3 p-4">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <CodeIcon className="size-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold">{t('credits.builtWith')}</h3>
          </div>
        </div>
        <Separator />
        <div className="p-4">
          <div className="grid grid-cols-2 gap-2">
            {[
              { name: 'Claude Code', desc: "Anthropic's CLI for Claude (Opus 4.6)" },
              { name: 'Tauri 2', desc: isIt ? 'Framework desktop cross-platform' : 'Cross-platform desktop framework' },
              { name: 'React + TypeScript', desc: 'Frontend' },
              { name: 'Rust', desc: isIt ? 'Backend nativo' : 'Native backend' },
              { name: 'shadcn/ui', desc: isIt ? 'Componenti UI' : 'UI Components' },
              { name: 'Tailwind CSS v4', desc: 'Styling' },
              { name: 'Zustand', desc: 'State management' },
              { name: 'xterm.js', desc: isIt ? 'Terminale integrato' : 'Embedded terminal' },
            ].map((tech) => (
              <div key={tech.name} className="rounded-lg bg-muted/30 p-2.5">
                <p className="text-sm font-medium">{tech.name}</p>
                <p className="text-xs text-muted-foreground">{tech.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="text-xs text-muted-foreground text-center pt-2">
        {t('credits.pairProgramming')}
      </p>
    </div>
  )
}
