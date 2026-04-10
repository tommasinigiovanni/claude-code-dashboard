import { useState, useEffect } from 'react'
import {
  listTmuxSessions, killTmuxSession, tmuxSessionCwd,
  checkClaudeInstalled, launchClaudeCode, pickDirectory,
} from '@/services/api'
import { toast } from 'sonner'
import { useConfigStore } from '@/store/configStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getSettings } from '@/pages/SettingsPage'
import { getSshConfig } from '@/hooks/useSshConfig'
import { EmbeddedTerminal } from '@/components/terminal/EmbeddedTerminal'
import { ChatView } from '@/components/chat/ChatView'
import { useI18n } from '@/i18n/useI18n'
import { Input } from '@/components/ui/input'

async function fetchTmuxSessions(): Promise<TmuxSession[]> {
  const ssh = getSshConfig()
  return listTmuxSessions(ssh)
}

interface TmuxSession {
  name: string
  attached: boolean
  windows: number
  created: string
}

function TmuxSessions({ onAttach }: { onAttach: (name: string) => void }) {
  const { t } = useI18n()
  const [sessions, setSessions] = useState<TmuxSession[]>([])

  useEffect(() => {
    fetchTmuxSessions().then(setSessions).catch(() => {})
  }, [])

  const handleKill = async (name: string) => {
    try {
      const ssh = getSshConfig()
      await killTmuxSession(name, ssh)
      setSessions((prev) => prev.filter((s) => s.name !== name))
      toast.success(`"${name}" ${t('common.terminated')}`)
    } catch (e) {
      toast.error(`${t('common.error')}: ${e}`)
    }
  }

  if (sessions.length === 0) return null

  return (
    <div className="mb-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">{t('launcher.tmuxSessions')}</h3>
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
                {t('agents.reattach')}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleKill(s.name)} className="text-destructive">
                {t('agents.terminate')}
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
      fetchTmuxSessions().then(setSessions).catch(() => {})
    }
    load()
    const interval = setInterval(load, 10000)
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

function RemoteFolderPicker({ onSelect, suggestions }: { onSelect: (path: string) => void; suggestions: string[] }) {
  const [value, setValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const filtered = suggestions.filter((s) =>
    s.toLowerCase().includes(value.toLowerCase())
  )

  return (
    <div className="relative flex gap-2 flex-1">
      <div className="relative flex-1">
        <Input
          value={value}
          onChange={(e) => { setValue(e.target.value); setShowSuggestions(true) }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder="/home/user/project"
          className="h-9"
          onKeyDown={(e) => e.key === 'Enter' && value.trim() && onSelect(value.trim())}
        />
        {showSuggestions && filtered.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-auto rounded-lg border border-border bg-popover shadow-lg">
            {filtered.map((path) => (
              <button
                key={path}
                className="w-full text-left px-3 py-2 text-sm font-mono hover:bg-accent transition-colors truncate"
                onMouseDown={() => { setValue(path); onSelect(path) }}
              >
                {path}
              </button>
            ))}
          </div>
        )}
      </div>
      <Button variant="outline" size="sm" onClick={() => value.trim() && onSelect(value.trim())} disabled={!value.trim()}>
        ▶
      </Button>
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
  const { mode, projectPath, mcpServers, subAgents, localSkills, installedPlugins, cloudConnectors, recentProjects } =
    useConfigStore()
  const { t } = useI18n()
  const [claudeInstalled, setClaudeInstalled] = useState<boolean | null>(null)
  const [recentLaunches, setRecentLaunches] = useState<string[]>([])
  const [showEmbedded, setShowEmbedded] = useState(false)
  const [launchPath, setLaunchPath] = useState<string | null>(null)
  const [tmuxAttachSession, setTmuxAttachSession] = useState<string | null>(null)
  const settings = getSettings()
  const isEmbedded = settings.terminalApp === 'embedded'
  const isChat = settings.terminalApp === 'chat'

  useEffect(() => {
    checkClaudeInstalled().then(setClaudeInstalled).catch(() => setClaudeInstalled(false))
    // Use remote recent projects when SSH is active, local otherwise
    if (getSshConfig()) {
      // recentProjects from store are already loaded from VM
    } else {
      setRecentLaunches(getRecentLaunches())
    }

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
      await launchClaudeCode(targetPath, terminalApp)
      if (targetPath) {
        addRecentLaunch(targetPath)
        setRecentLaunches(getRecentLaunches())
      }
      toast.success(t('common.started'))
    } catch (e) {
      toast.error(`${t('common.error')}: ${e}`)
    }
  }

  const isRemote = !!getSshConfig()

  const handleSelectAndLaunch = async () => {
    try {
      const selected = await pickDirectory()
      if (selected) {
        await handleLaunch(selected)
      }
    } catch (e) {
      toast.error(`${t('common.error')}: ${e}`)
    }
  }

  // Embedded terminal view
  if (showEmbedded) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between gap-2 px-3 md:px-4 py-2 border-b border-border bg-card">
          <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
            <TmuxSessionTabs
              activeSession={tmuxAttachSession}
              onSwitch={async (name) => {
                try {
                  const cwd = await tmuxSessionCwd(name)
                  if (cwd) setLaunchPath(cwd)
                } catch { /* ignore */ }
                setTmuxAttachSession(name)
              }}
            />
            {(launchPath ?? projectPath) && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(launchPath ?? projectPath ?? '')
                  toast.success(t('common.pathCopied'))
                }}
                title="Clicca per copiare"
                className="cursor-pointer min-w-0"
              >
                <Badge variant="secondary" className="text-xs font-mono truncate max-w-[40vw] md:max-w-none hover:bg-accent transition-colors">
                  {launchPath ?? projectPath}
                </Badge>
              </button>
            )}
          </div>
          <Button variant="ghost" size="sm" className="shrink-0" onClick={() => { setShowEmbedded(false); setTmuxAttachSession(null) }}>
            {t('launcher.close')}
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
    <div className="p-4 md:p-6">
      <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">{t('launcher.title')}</h2>

      {/* Status */}
      <div className="rounded-lg border border-border p-4 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🚀</span>
          <div>
            <p className="font-medium">Claude Code</p>
            <p className="text-sm text-muted-foreground">
              {claudeInstalled === null
                ? t('launcher.checking')
                : claudeInstalled
                  ? t('launcher.installed')
                  : t('launcher.notFound')}
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

        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={() => handleLaunch()} disabled={!claudeInstalled} className="w-full sm:w-auto">
            {t('launcher.launch')} {isEmbedded ? `(${t('launcher.embeddedTerminal')})` : ''}
          </Button>
          {isRemote ? (
            <RemoteFolderPicker onSelect={(path) => handleLaunch(path)} suggestions={recentProjects} />
          ) : (
            <Button variant="outline" onClick={handleSelectAndLaunch} disabled={!claudeInstalled} className="w-full sm:w-auto">
              {t('launcher.selectAndLaunch')}
            </Button>
          )}
        </div>
      </div>

      {/* SSH indicator */}
      {isRemote && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 mb-6 flex items-center gap-2">
          <span className="text-sm">🖥️</span>
          <span className="text-sm font-medium">{getSshConfig()?.name}</span>
          <span className="text-xs text-muted-foreground">({getSshConfig()?.user}@{getSshConfig()?.host})</span>
        </div>
      )}

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
      <div className="rounded-lg border border-border p-4 mb-6 overflow-hidden">
        <p className="text-sm font-medium mb-1">{t('launcher.activeContext')}</p>
        <p className="text-sm text-muted-foreground truncate">
          {mode === 'global' ? 'Global (~/.claude/settings.json)' : `Project: ${projectPath}`}
        </p>
      </div>

      {/* Tmux sessions */}
      {settings.useTmux && <TmuxSessions onAttach={async (name) => {
        // Get the working directory from the tmux session
        try {
          const cwd = await tmuxSessionCwd(name)
          if (cwd) setLaunchPath(cwd)
        } catch { /* ignore */ }
        setTmuxAttachSession(name)
        setShowEmbedded(true)
      }} />}

      {/* Recent launches */}
      {(isRemote ? recentProjects : recentLaunches).length > 0 && (
        <>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">{t('launcher.recentLaunches')}</h3>
          <div className="space-y-2">
            {(isRemote ? recentProjects : recentLaunches).map((path) => (
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
