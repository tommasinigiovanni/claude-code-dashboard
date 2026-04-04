import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { toast } from 'sonner'
import { useConfigStore } from '@/store/configStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getSettings } from '@/pages/SettingsPage'
import { EmbeddedTerminal } from '@/components/terminal/EmbeddedTerminal'
import { ChatView } from '@/components/chat/ChatView'

interface TmuxSession {
  name: string
  attached: boolean
  windows: number
  created: string
}

function TmuxSessions({ onAttach }: { onAttach: (name: string) => void }) {
  const [sessions, setSessions] = useState<TmuxSession[]>([])

  useEffect(() => {
    invoke<TmuxSession[]>('tmux_list_sessions').then(setSessions).catch(() => {})
  }, [])

  const handleKill = async (name: string) => {
    try {
      await invoke('tmux_kill_session', { sessionName: name })
      setSessions((prev) => prev.filter((s) => s.name !== name))
      toast.success(`Sessione "${name}" terminata`)
    } catch (e) {
      toast.error(`Errore: ${e}`)
    }
  }

  if (sessions.length === 0) return null

  return (
    <div className="mb-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">Sessioni tmux attive</h3>
      <div className="space-y-2">
        {sessions.map((s) => (
          <div key={s.name} className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <span className="text-sm font-medium">{s.name}</span>
              <span className="text-xs text-muted-foreground ml-2">
                {s.windows} window{s.windows > 1 ? 's' : ''} · {s.created}
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => onAttach(s.name)}>
                Riattacca
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleKill(s.name)} className="text-destructive">
                Termina
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TmuxSessionTabs({
  activeSession,
  onSwitch,
}: {
  activeSession: string | null
  onSwitch: (name: string) => void
}) {
  const [sessions, setSessions] = useState<TmuxSession[]>([])

  useEffect(() => {
    const load = () => {
      invoke<TmuxSession[]>('tmux_list_sessions').then(setSessions).catch(() => {})
    }
    load()
    const interval = setInterval(load, 3000)
    return () => clearInterval(interval)
  }, [])

  if (sessions.length <= 1) return null

  return (
    <div className="flex gap-1">
      {sessions.map((s) => (
        <button
          key={s.name}
          onClick={() => onSwitch(s.name)}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
            activeSession === s.name
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          }`}
        >
          {s.name.replace('claude-', '')}
        </button>
      ))}
    </div>
  )
}

const RECENT_KEY = 'claude-dashboard-recent-launches'
const MAX_RECENT = 5

function getRecentLaunches(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function addRecentLaunch(path: string) {
  const recent = getRecentLaunches().filter((p) => p !== path)
  recent.unshift(path)
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)))
}

export function LauncherPage() {
  const { mode, projectPath, mcpServers, subAgents, localSkills, installedPlugins, cloudConnectors } =
    useConfigStore()
  const [claudeInstalled, setClaudeInstalled] = useState<boolean | null>(null)
  const [recentLaunches, setRecentLaunches] = useState<string[]>([])
  const [showEmbedded, setShowEmbedded] = useState(false)
  const [launchPath, setLaunchPath] = useState<string | null>(null)
  const [tmuxAttachSession, setTmuxAttachSession] = useState<string | null>(null)
  const settings = getSettings()
  const isEmbedded = settings.terminalApp === 'embedded'
  const isChat = settings.terminalApp === 'chat'

  useEffect(() => {
    invoke<boolean>('check_claude_installed').then(setClaudeInstalled).catch(() => setClaudeInstalled(false))
    setRecentLaunches(getRecentLaunches())

    // Check if navigated here via Command Palette tmux attach
    if (window.__tmuxAttach) {
      const { name, cwd } = window.__tmuxAttach
      delete window.__tmuxAttach
      if (cwd) setLaunchPath(cwd)
      setTmuxAttachSession(name)
      setShowEmbedded(true)
    }

    // Listen for tmux-attach events from Command Palette
    const handler = (e: Event) => {
      const { name, cwd } = (e as CustomEvent).detail
      if (cwd) setLaunchPath(cwd)
      setTmuxAttachSession(name)
      setShowEmbedded(true)
    }
    window.addEventListener('tmux-attach', handler)
    return () => window.removeEventListener('tmux-attach', handler)
  }, [])

  const handleLaunch = async (path?: string) => {
    const targetPath = path ?? projectPath ?? undefined

    if (isEmbedded || isChat) {
      setLaunchPath(targetPath ?? null)
      setShowEmbedded(true)
      if (targetPath) {
        addRecentLaunch(targetPath)
        setRecentLaunches(getRecentLaunches())
      }
      return
    }

    try {
      const terminalApp = settings.terminalApp === 'custom'
        ? settings.customTerminalPath
        : settings.terminalApp
      await invoke('launch_claude_code', { projectPath: targetPath, terminalApp })
      if (targetPath) {
        addRecentLaunch(targetPath)
        setRecentLaunches(getRecentLaunches())
      }
      toast.success('Claude Code avviato!')
    } catch (e) {
      toast.error(`Errore: ${e}`)
    }
  }

  const handleSelectAndLaunch = async () => {
    try {
      const selected = await invoke<string | null>('pick_directory')
      if (selected) {
        await handleLaunch(selected)
      }
    } catch (e) {
      toast.error(`Errore: ${e}`)
    }
  }

  // Embedded terminal view
  if (showEmbedded) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <TmuxSessionTabs
              activeSession={tmuxAttachSession}
              onSwitch={async (name) => {
                try {
                  const cwd = await invoke<string | null>('tmux_session_cwd', { sessionName: name })
                  if (cwd) setLaunchPath(cwd)
                } catch { /* ignore */ }
                setTmuxAttachSession(name)
              }}
            />
            {(launchPath ?? projectPath) && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(launchPath ?? projectPath ?? '')
                  toast.success('Path copiato!')
                }}
                title="Clicca per copiare"
                className="cursor-pointer"
              >
                <Badge variant="secondary" className="text-xs font-mono truncate hover:bg-accent transition-colors">
                  {launchPath ?? projectPath}
                </Badge>
              </button>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setShowEmbedded(false); setTmuxAttachSession(null) }}>
            Chiudi
          </Button>
        </div>
        <div className="flex-1 min-h-0">
          {isChat ? (
            <ChatView key={`${tmuxAttachSession ?? 'none'}-${launchPath ?? projectPath ?? 'global'}`} projectPath={launchPath ?? projectPath} />
          ) : (
            <EmbeddedTerminal
              key={tmuxAttachSession ?? 'default'}
              projectPath={launchPath}
              useTmux={settings.useTmux}
              tmuxAttachSession={tmuxAttachSession}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Launcher</h2>

      {/* Status */}
      <div className="rounded-lg border border-border p-4 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🚀</span>
          <div>
            <p className="font-medium">Claude Code</p>
            <p className="text-sm text-muted-foreground">
              {claudeInstalled === null
                ? 'Verifica installazione…'
                : claudeInstalled
                  ? 'Installato e disponibile'
                  : 'Non trovato nel PATH'}
            </p>
          </div>
          {claudeInstalled !== null && (
            <Badge variant={claudeInstalled ? 'default' : 'destructive'} className="ml-auto">
              {claudeInstalled ? 'OK' : 'Non trovato'}
            </Badge>
          )}
        </div>

        {!claudeInstalled && claudeInstalled !== null && (
          <p className="text-sm text-muted-foreground mb-4">
            Installa Claude Code con: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">npm install -g @anthropic-ai/claude-code</code>
          </p>
        )}

        <div className="flex gap-2">
          <Button onClick={() => handleLaunch()} disabled={!claudeInstalled}>
            ▶ Avvia Claude Code {isEmbedded ? '(integrato)' : ''}
          </Button>
          <Button variant="outline" onClick={handleSelectAndLaunch} disabled={!claudeInstalled}>
            📁 Seleziona cartella e avvia
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded-lg border border-border p-4 text-center">
          <p className="text-2xl font-bold">{cloudConnectors.length + mcpServers.length}</p>
          <p className="text-sm text-muted-foreground">MCP Servers</p>
        </div>
        <div className="rounded-lg border border-border p-4 text-center">
          <p className="text-2xl font-bold">{installedPlugins.length}</p>
          <p className="text-sm text-muted-foreground">Plugins</p>
        </div>
        <div className="rounded-lg border border-border p-4 text-center">
          <p className="text-2xl font-bold">{localSkills.length}</p>
          <p className="text-sm text-muted-foreground">Skills</p>
        </div>
        <div className="rounded-lg border border-border p-4 text-center">
          <p className="text-2xl font-bold">{subAgents.length}</p>
          <p className="text-sm text-muted-foreground">Sub-agents</p>
        </div>
      </div>

      {/* Contesto attivo */}
      <div className="rounded-lg border border-border p-4 mb-6">
        <p className="text-sm font-medium mb-1">Contesto attivo</p>
        <p className="text-sm text-muted-foreground">
          {mode === 'global' ? 'Global (~/.claude/settings.json)' : `Project: ${projectPath}`}
        </p>
      </div>

      {/* Tmux sessions */}
      {settings.useTmux && <TmuxSessions onAttach={async (name) => {
        // Get the working directory from the tmux session
        try {
          const cwd = await invoke<string | null>('tmux_session_cwd', { sessionName: name })
          if (cwd) setLaunchPath(cwd)
        } catch { /* ignore */ }
        setTmuxAttachSession(name)
        setShowEmbedded(true)
      }} />}

      {/* Recent launches */}
      {recentLaunches.length > 0 && (
        <>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Avvii recenti</h3>
          <div className="space-y-2">
            {recentLaunches.map((path) => (
              <div
                key={path}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <span className="text-sm font-mono truncate flex-1">{path}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleLaunch(path)}
                  disabled={!claudeInstalled}
                >
                  ▶
                </Button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
