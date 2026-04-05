import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useI18n } from '@/i18n/useI18n'
import { ImportExportPage } from '@/pages/ImportExportPage'
import { useConfigStore } from '@/store/configStore'
import {
  PaletteIcon, RocketIcon, GlobeIcon, MonitorIcon, MessageSquareIcon,
  TerminalIcon, SmartphoneIcon, KeyIcon, TrashIcon, ChevronDownIcon,
  ChevronUpIcon,
} from 'lucide-react'

export const SETTINGS_KEY = 'claude-dashboard-settings'

export type TerminalApp = 'chat' | 'Terminal' | 'iTerm' | 'Warp' | 'Alacritty' | 'embedded' | 'custom'

export interface SshProfile {
  name: string
  host: string
  port: number
  user: string
  keyPath: string
}

export interface DashboardSettings {
  theme: 'dark' | 'light' | 'system'
  claudePathOverride: string
  terminalApp: TerminalApp
  customTerminalPath: string
  useTmux: boolean
  language: 'it' | 'en'
  telegramBotToken: string
  telegramChatId: string
  autoApprovePermissions: boolean
  sshProfiles: SshProfile[]
  activeSshProfile: string | null
}

const defaultSettings: DashboardSettings = {
  theme: 'dark',
  claudePathOverride: '',
  terminalApp: 'Terminal',
  customTerminalPath: '',
  useTmux: false,
  language: 'it',
  telegramBotToken: '',
  telegramChatId: '',
  autoApprovePermissions: false,
  sshProfiles: [],
  activeSshProfile: null,
}

export function getSettings(): DashboardSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings
  } catch {
    return defaultSettings
  }
}

function saveSettings(settings: DashboardSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

function applyTheme(theme: 'dark' | 'light' | 'system') {
  const html = document.documentElement
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    html.classList.toggle('dark', prefersDark)
  } else {
    html.classList.toggle('dark', theme === 'dark')
  }
}

// ─── Section Card ─────────────────────────────────────

function SettingsCard({
  icon,
  title,
  description,
  children,
  collapsible = false,
  defaultOpen = true,
}: {
  icon: React.ReactNode
  title: string
  description?: string
  children: React.ReactNode
  collapsible?: boolean
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        className={`w-full flex items-center gap-3 p-4 text-left ${collapsible ? 'cursor-pointer hover:bg-accent/30 transition-colors' : 'cursor-default'} ${open ? '' : 'rounded-xl'}`}
        onClick={() => collapsible && setOpen(!open)}
      >
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold">{title}</h3>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {collapsible && (
          open ? <ChevronUpIcon className="size-4 text-muted-foreground" /> : <ChevronDownIcon className="size-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <>
          <Separator />
          <div className="p-4 space-y-4">
            {children}
          </div>
        </>
      )}
    </div>
  )
}

// ─── SSH Profile Manager ──────────────────────────────

function SshProfileManager({
  settings, updateSetting, locale,
}: {
  settings: DashboardSettings
  updateSetting: <K extends keyof DashboardSettings>(key: K, value: DashboardSettings[K]) => void
  locale: string
}) {
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [host, setHost] = useState('')
  const [port, setPort] = useState('22')
  const [user, setUser] = useState('')
  const [keyPath, setKeyPath] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  const handleSave = () => {
    if (!name || !host || !user) return
    const profile: SshProfile = { name, host, port: parseInt(port) || 22, user, keyPath }
    const profiles = [...settings.sshProfiles.filter((p) => p.name !== name), profile]
    updateSetting('sshProfiles', profiles)
    setShowForm(false)
    setName(''); setHost(''); setPort('22'); setUser(''); setKeyPath('')
  }

  const handleDelete = (profileName: string) => {
    updateSetting('sshProfiles', settings.sshProfiles.filter((p) => p.name !== profileName))
    if (settings.activeSshProfile === profileName) updateSetting('activeSshProfile', null)
  }

  const handleTest = async (profile: SshProfile) => {
    setTesting(true); setTestResult(null)
    try {
      const result = await invoke<string>('ssh_test_connection', {
        config: { name: profile.name, host: profile.host, port: profile.port, user: profile.user, key_path: profile.keyPath || null },
      })
      if (result.startsWith('connected:')) {
        setTestResult(`✅ ${locale === 'it' ? 'Connesso' : 'Connected'} — Claude ${result.split(':')[1]}`)
      } else {
        setTestResult(`⚠️ ${locale === 'it' ? 'Connesso ma Claude non trovato' : 'Connected but Claude not found'}`)
      }
    } catch (e) { setTestResult(`❌ ${e}`) }
    finally { setTesting(false) }
  }

  return (
    <div className="space-y-3">
      {/* Active selector */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={!settings.activeSshProfile ? 'default' : 'outline'}
          size="sm"
          onClick={() => updateSetting('activeSshProfile', null)}
        >
          <MonitorIcon className="size-3 mr-1.5" /> Local
        </Button>
        {settings.sshProfiles.map((p) => (
          <Button
            key={p.name}
            variant={settings.activeSshProfile === p.name ? 'default' : 'outline'}
            size="sm"
            onClick={() => updateSetting('activeSshProfile', p.name)}
          >
            <GlobeIcon className="size-3 mr-1.5" /> {p.name}
          </Button>
        ))}
      </div>

      {/* Profile list */}
      {settings.sshProfiles.map((p) => (
        <div key={p.name} className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
          <div>
            <span className="text-sm font-medium">{p.name}</span>
            <p className="text-xs text-muted-foreground font-mono">{p.user}@{p.host}:{p.port}</p>
          </div>
          <div className="flex gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => handleTest(p)} disabled={testing}>
              {testing ? '...' : 'Test'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleDelete(p.name)}>
              <TrashIcon className="size-3.5 text-destructive" />
            </Button>
          </div>
        </div>
      ))}

      {testResult && <p className="text-xs px-1">{testResult}</p>}

      {showForm ? (
        <div className="space-y-3 rounded-lg bg-muted/20 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">{locale === 'it' ? 'Nome' : 'Name'}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="my-vm" className="h-8 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs">Host</Label>
              <Input value={host} onChange={(e) => setHost(e.target.value)} placeholder="192.168.1.100" className="h-8 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs">{locale === 'it' ? 'Utente' : 'User'}</Label>
              <Input value={user} onChange={(e) => setUser(e.target.value)} placeholder="root" className="h-8 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs">{locale === 'it' ? 'Porta' : 'Port'}</Label>
              <Input value={port} onChange={(e) => setPort(e.target.value)} placeholder="22" className="h-8 text-sm mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">{locale === 'it' ? 'Chiave SSH' : 'SSH Key'} <span className="text-muted-foreground">({locale === 'it' ? 'opzionale' : 'optional'})</span></Label>
            <Input value={keyPath} onChange={(e) => setKeyPath(e.target.value)} placeholder="~/.ssh/id_rsa" className="h-8 text-sm mt-1" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={!name || !host || !user}>
              {locale === 'it' ? 'Salva' : 'Save'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
              {locale === 'it' ? 'Annulla' : 'Cancel'}
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
          + {locale === 'it' ? 'Aggiungi VM' : 'Add VM'}
        </Button>
      )}
    </div>
  )
}

// ─── Telegram Bot Controls ────────────────────────────

function TelegramBotControls({ settings, locale }: { settings: DashboardSettings; locale: string }) {
  const [botRunning, setBotRunning] = useState(false)
  const [botName, setBotName] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    invoke<{ running: boolean; bot_name: string | null }>('telegram_bot_status')
      .then((s) => { setBotRunning(s.running); setBotName(s.bot_name) })
      .catch(() => {})
  }, [])

  const handleStart = async () => {
    if (!settings.telegramBotToken) { toast.error(locale === 'it' ? 'Inserisci il Bot Token' : 'Enter Bot Token'); return }
    setStarting(true)
    try {
      const chatId = settings.telegramChatId ? parseInt(settings.telegramChatId) : undefined
      const result = await invoke<{ running: boolean; bot_name: string | null }>('telegram_start_bot', {
        botToken: settings.telegramBotToken, allowedChatId: chatId || null, projectPath: null, autoApprove: false,
      })
      setBotRunning(result.running); setBotName(result.bot_name ?? null)
      toast.success(`Bot @${result.bot_name} ${locale === 'it' ? 'avviato!' : 'started!'}`)
    } catch (e) { toast.error(`Error: ${e}`) }
    finally { setStarting(false) }
  }

  const handleStop = async () => {
    try { await invoke('telegram_stop_bot'); setBotRunning(false); setBotName(null); toast.success(locale === 'it' ? 'Bot fermato' : 'Bot stopped') }
    catch (e) { toast.error(`Error: ${e}`) }
  }

  return (
    <div className="flex items-center gap-3">
      {botRunning ? (
        <>
          <Badge variant="default" className="text-xs">🟢 @{botName ?? 'bot'}</Badge>
          <Button variant="outline" size="sm" onClick={handleStop}>
            {locale === 'it' ? 'Ferma' : 'Stop'}
          </Button>
        </>
      ) : (
        <Button size="sm" onClick={handleStart} disabled={starting || !settings.telegramBotToken}>
          {starting ? '...' : locale === 'it' ? '▶ Avvia' : '▶ Start'}
        </Button>
      )}
    </div>
  )
}

// ─── Settings Page ────────────────────────────────────

export function SettingsPage() {
  const { t, locale } = useI18n()
  const [settings, setSettings] = useState<DashboardSettings>(getSettings)
  const loadConfigs = useConfigStore((s) => s.loadConfigs)

  useEffect(() => { applyTheme(settings.theme) }, [settings.theme])

  const updateSetting = <K extends keyof DashboardSettings>(key: K, value: DashboardSettings[K]) => {
    const updated = { ...settings, [key]: value }
    setSettings(updated)
    saveSettings(updated)
    window.dispatchEvent(new CustomEvent('settings-changed'))
    toast.success(t('settings.saved'))
    if (key === 'activeSshProfile') setTimeout(() => loadConfigs(), 100)
  }

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold mb-2">{t('settings.title')}</h2>

      {/* ── Appearance ── */}
      <SettingsCard
        icon={<PaletteIcon className="size-4" />}
        title={locale === 'it' ? 'Aspetto' : 'Appearance'}
        description={locale === 'it' ? 'Tema e lingua dell\'interfaccia' : 'Theme and interface language'}
      >
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('settings.theme')}</Label>
            <div className="flex gap-2">
              {(['dark', 'light', 'system'] as const).map((theme) => (
                <Button key={theme} variant={settings.theme === theme ? 'default' : 'outline'} size="sm"
                  onClick={() => updateSetting('theme', theme)}>
                  {theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '💻'} {theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : locale === 'it' ? 'Sistema' : 'System'}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('settings.language')}</Label>
            <div className="flex gap-2">
              <Button variant={settings.language === 'it' ? 'default' : 'outline'} size="sm" onClick={() => updateSetting('language', 'it')}>🇮🇹 Italiano</Button>
              <Button variant={settings.language === 'en' ? 'default' : 'outline'} size="sm" onClick={() => updateSetting('language', 'en')}>🇬🇧 English</Button>
            </div>
          </div>
        </div>
      </SettingsCard>

      {/* ── Launcher ── */}
      <SettingsCard
        icon={<RocketIcon className="size-4" />}
        title="Launcher"
        description={locale === 'it' ? 'Come avviare Claude Code' : 'How to launch Claude Code'}
      >
        <div className="space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
              {locale === 'it' ? 'Integrato' : 'Built-in'}
            </Label>
            <div className="flex gap-2">
              <Button variant={settings.terminalApp === 'chat' ? 'default' : 'outline'} size="sm"
                onClick={() => updateSetting('terminalApp', 'chat')}>
                <MessageSquareIcon className="size-3 mr-1.5" /> Chat
              </Button>
              <Button variant={settings.terminalApp === 'embedded' ? 'default' : 'outline'} size="sm"
                onClick={() => updateSetting('terminalApp', 'embedded')}>
                <TerminalIcon className="size-3 mr-1.5" /> {locale === 'it' ? 'Terminale' : 'Terminal'}
              </Button>
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
              {locale === 'it' ? 'Terminale esterno' : 'External terminal'}
            </Label>
            <div className="flex gap-2 flex-wrap">
              {(['Terminal', 'iTerm', 'Warp', 'Alacritty', 'custom'] as const).map((id) => (
                <Button key={id} variant={settings.terminalApp === id ? 'default' : 'outline'} size="sm"
                  onClick={() => updateSetting('terminalApp', id)}>
                  {id === 'iTerm' ? 'iTerm2' : id === 'custom' ? (locale === 'it' ? 'Altro…' : 'Other…') : id}
                </Button>
              ))}
            </div>
            {settings.terminalApp === 'custom' && (
              <Input value={settings.customTerminalPath} onChange={(e) => updateSetting('customTerminalPath', e.target.value)}
                placeholder="es. /Applications/Kitty.app" className="mt-2" />
            )}
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">tmux</p>
              <p className="text-xs text-muted-foreground">{t('settings.tmuxDesc')}</p>
            </div>
            <Switch checked={settings.useTmux} onCheckedChange={(checked) => updateSetting('useTmux', !!checked)} />
          </div>
        </div>
      </SettingsCard>

      {/* ── SSH Remote ── */}
      <SettingsCard
        icon={<MonitorIcon className="size-4" />}
        title="SSH Remote"
        description={locale === 'it' ? 'Connetti a una VM remota con Claude Code' : 'Connect to a remote VM with Claude Code'}
        collapsible
        defaultOpen={settings.sshProfiles.length > 0}
      >
        <SshProfileManager settings={settings} updateSetting={updateSetting} locale={locale} />
      </SettingsCard>

      {/* ── Telegram ── */}
      <SettingsCard
        icon={<SmartphoneIcon className="size-4" />}
        title="Telegram Bot"
        description={locale === 'it' ? 'Controlla Claude Code dal cellulare' : 'Control Claude Code from your phone'}
        collapsible
        defaultOpen={!!settings.telegramBotToken}
      >
        <div className="space-y-3">
          <Input value={settings.telegramBotToken} onChange={(e) => updateSetting('telegramBotToken', e.target.value)}
            placeholder="Bot Token" type="password" />
          <Input value={settings.telegramChatId} onChange={(e) => updateSetting('telegramChatId', e.target.value)}
            placeholder={locale === 'it' ? 'Chat ID (opzionale)' : 'Chat ID (optional)'} />
          <p className="text-xs text-muted-foreground">
            {locale === 'it'
              ? 'Crea un bot con @BotFather, incolla il token. Invia /chatid al bot per ottenere il tuo ID.'
              : 'Create a bot with @BotFather, paste the token. Send /chatid to the bot to get your ID.'}
          </p>
          <TelegramBotControls settings={settings} locale={locale} />
          {settings.telegramBotToken && !settings.telegramChatId && (
            <p className="text-xs text-amber-500">
              ⚠️ {locale === 'it'
                ? 'Senza Chat ID, chiunque può usare il bot. Invia /chatid al bot per ottenere il tuo ID.'
                : 'Without Chat ID, anyone can use the bot. Send /chatid to the bot to get your ID.'}
            </p>
          )}
        </div>
      </SettingsCard>

      {/* ── Advanced ── */}
      <SettingsCard
        icon={<KeyIcon className="size-4" />}
        title={locale === 'it' ? 'Avanzate' : 'Advanced'}
        description={locale === 'it' ? 'Path, dati, import/export' : 'Path, data, import/export'}
        collapsible
        defaultOpen={false}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('settings.claudePath')}</Label>
            <Input value={settings.claudePathOverride} onChange={(e) => updateSetting('claudePathOverride', e.target.value)}
              placeholder={t('settings.claudePathPlaceholder')} />
            <p className="text-xs text-muted-foreground">{t('settings.claudePathDesc')}</p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('settings.localData')}</Label>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => {
                for (const k of Object.keys(localStorage)) { if (k.startsWith('claude-dashboard-chat')) localStorage.removeItem(k) }
                toast.success(t('common.chatCleared'))
              }}>
                <TrashIcon className="size-3 mr-1.5" /> {t('settings.clearChatHistory')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                localStorage.removeItem('claude-dashboard-recent-launches')
                toast.success(t('common.recentCleared'))
              }}>
                <TrashIcon className="size-3 mr-1.5" /> {t('settings.clearRecentLaunches')}
              </Button>
            </div>
          </div>

          <Separator />

          <ImportExportPage />

          <Separator />

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Backup</Label>
            <p className="text-xs text-muted-foreground">
              {locale === 'it'
                ? 'Un backup viene creato ad ogni avvio. Ultimi 7 conservati in ~/.claude/dashboard-backups/'
                : 'A backup is created on each launch. Last 7 kept in ~/.claude/dashboard-backups/'}
            </p>
            <Button variant="outline" size="sm" onClick={async () => {
              try {
                const result = await invoke<string>('auto_backup')
                toast.success(`Backup: ${result}`)
              } catch (e) {
                toast.error(`${t('common.error')}: ${e}`)
              }
            }}>
              {locale === 'it' ? 'Crea backup ora' : 'Create backup now'}
            </Button>
          </div>
        </div>
      </SettingsCard>

      {/* ── Footer ── */}
      <div className="text-center py-4">
        <p className="text-xs text-muted-foreground">Claude Code Dashboard v1.0.0</p>
        <p className="text-xs text-muted-foreground">
          {locale === 'it' ? 'Configurazione' : 'Configuration'}: ~/.claude/settings.json
        </p>
      </div>
    </div>
  )
}
