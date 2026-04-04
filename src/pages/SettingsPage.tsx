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

export const SETTINGS_KEY = 'claude-dashboard-settings'

export type TerminalApp = 'chat' | 'Terminal' | 'iTerm' | 'Warp' | 'Alacritty' | 'embedded' | 'custom'

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
    if (!settings.telegramBotToken) {
      toast.error(locale === 'it' ? 'Inserisci il Bot Token' : 'Enter Bot Token')
      return
    }
    setStarting(true)
    try {
      const chatId = settings.telegramChatId ? parseInt(settings.telegramChatId) : undefined
      const result = await invoke<{ running: boolean; bot_name: string | null }>('telegram_start_bot', {
        botToken: settings.telegramBotToken,
        allowedChatId: chatId || null,
        projectPath: null,
        autoApprove: settings.autoApprovePermissions,
      })
      setBotRunning(result.running)
      setBotName(result.bot_name ?? null)
      toast.success(`Bot @${result.bot_name} ${locale === 'it' ? 'avviato!' : 'started!'}`)
    } catch (e) {
      toast.error(`${locale === 'it' ? 'Errore' : 'Error'}: ${e}`)
    } finally {
      setStarting(false)
    }
  }

  const handleStop = async () => {
    try {
      await invoke('telegram_stop_bot')
      setBotRunning(false)
      setBotName(null)
      toast.success(locale === 'it' ? 'Bot fermato' : 'Bot stopped')
    } catch (e) {
      toast.error(`Error: ${e}`)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {botRunning ? (
        <>
          <Badge variant="default" className="text-xs">
            🟢 @{botName ?? 'bot'} {locale === 'it' ? 'attivo' : 'active'}
          </Badge>
          <Button variant="outline" size="sm" onClick={handleStop}>
            {locale === 'it' ? 'Ferma bot' : 'Stop bot'}
          </Button>
        </>
      ) : (
        <Button size="sm" onClick={handleStart} disabled={starting || !settings.telegramBotToken}>
          {starting ? '...' : locale === 'it' ? '▶ Avvia bot Telegram' : '▶ Start Telegram bot'}
        </Button>
      )}
    </div>
  )
}

export function SettingsPage() {
  const { t, locale } = useI18n()
  const [settings, setSettings] = useState<DashboardSettings>(getSettings)

  useEffect(() => {
    applyTheme(settings.theme)
  }, [settings.theme])

  const updateSetting = <K extends keyof DashboardSettings>(key: K, value: DashboardSettings[K]) => {
    const updated = { ...settings, [key]: value }
    setSettings(updated)
    saveSettings(updated)
    toast.success(t('settings.saved'))
  }

  return (
    <div className="p-6 max-w-3xl">
      <h2 className="text-2xl font-bold mb-6">{t('settings.title')}</h2>

      {/* Theme + Language row */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div className="space-y-3">
          <Label>{t('settings.theme')}</Label>
          <div className="flex gap-2">
            {(['dark', 'light', 'system'] as const).map((theme) => (
              <Button
                key={theme}
                variant={settings.theme === theme ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateSetting('theme', theme)}
              >
                {theme === 'dark' ? t('settings.dark') : theme === 'light' ? t('settings.light') : t('settings.system')}
              </Button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <Label>{t('settings.language')}</Label>
          <div className="flex gap-2">
            <Button
              variant={settings.language === 'it' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateSetting('language', 'it')}
            >
              🇮🇹 Italiano
            </Button>
            <Button
              variant={settings.language === 'en' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateSetting('language', 'en')}
            >
              🇬🇧 English
            </Button>
          </div>
        </div>
      </div>

      <Separator className="mb-8" />

      {/* Launcher mode */}
      <div className="space-y-4 mb-8">
        <Label>{locale === 'it' ? 'Modalità di avvio' : 'Launch mode'}</Label>

        {/* Chat & Internal Terminal */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">{locale === 'it' ? 'Integrato nell\'app' : 'Built-in'}</p>
          <div className="flex gap-2">
            <Button
              variant={settings.terminalApp === 'chat' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateSetting('terminalApp', 'chat')}
            >
              💬 Chat
            </Button>
            <Button
              variant={settings.terminalApp === 'embedded' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateSetting('terminalApp', 'embedded')}
            >
              🖥️ {locale === 'it' ? 'Terminale interno' : 'Internal Terminal'}
            </Button>
          </div>
        </div>

        {/* External terminals */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">{locale === 'it' ? 'Terminale esterno' : 'External terminal'}</p>
          <div className="flex gap-2 flex-wrap">
            {(['Terminal', 'iTerm', 'Warp', 'Alacritty', 'custom'] as const).map((id) => (
              <Button
                key={id}
                variant={settings.terminalApp === id ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateSetting('terminalApp', id)}
              >
                {id === 'iTerm' ? 'iTerm2' : id === 'custom' ? (locale === 'it' ? 'Altro…' : 'Other…') : id}
              </Button>
            ))}
          </div>
          {settings.terminalApp === 'custom' && (
            <Input
              value={settings.customTerminalPath}
              onChange={(e) => updateSetting('customTerminalPath', e.target.value)}
              placeholder="es. /Applications/Kitty.app"
              className="mt-2"
            />
          )}
        </div>

        <p className="text-xs text-muted-foreground">{t('settings.terminalDesc')}</p>
      </div>

      {/* tmux */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Label>{t('settings.useTmux')}</Label>
          <p className="text-xs text-muted-foreground mt-1">{t('settings.tmuxDesc')}</p>
        </div>
        <Switch
          checked={settings.useTmux}
          onCheckedChange={(checked) => updateSetting('useTmux', !!checked)}
        />
      </div>

      <Separator className="mb-8" />

      {/* Claude path override */}
      <div className="space-y-3 mb-8">
        <Label htmlFor="claude-path">{t('settings.claudePath')}</Label>
        <Input
          id="claude-path"
          value={settings.claudePathOverride}
          onChange={(e) => updateSetting('claudePathOverride', e.target.value)}
          placeholder={t('settings.claudePathPlaceholder')}
        />
        <p className="text-xs text-muted-foreground">{t('settings.claudePathDesc')}</p>
      </div>

      <Separator className="mb-8" />

      {/* Telegram Bot */}
      <div className="space-y-4 mb-8">
        <Label>📱 Telegram Bot</Label>
        <p className="text-xs text-muted-foreground">
          {locale === 'it'
            ? 'Controlla Claude Code dal cellulare via Telegram. Crea un bot con @BotFather, incolla il token qui e avvia.'
            : 'Control Claude Code from your phone via Telegram. Create a bot with @BotFather, paste the token here and start.'}
        </p>
        <div className="space-y-3">
          <Input
            value={settings.telegramBotToken}
            onChange={(e) => updateSetting('telegramBotToken', e.target.value)}
            placeholder="Bot Token (es. 123456:ABC-DEF...)"
            type="password"
          />
          <Input
            value={settings.telegramChatId}
            onChange={(e) => updateSetting('telegramChatId', e.target.value)}
            placeholder={locale === 'it' ? 'Chat ID (opzionale, per sicurezza)' : 'Chat ID (optional, for security)'}
          />
          <p className="text-xs text-muted-foreground">
            {locale === 'it'
              ? 'Invia /chatid al bot per ottenere il tuo Chat ID. Se lo imposti, solo tu potrai usare il bot.'
              : 'Send /chatid to the bot to get your Chat ID. If set, only you can use the bot.'}
          </p>
          <TelegramBotControls settings={settings} locale={locale} />
        </div>
      </div>

      <Separator className="mb-8" />

      {/* Storage */}
      <div className="space-y-3 mb-8">
        <Label>{t('settings.localData')}</Label>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              for (const k of Object.keys(localStorage)) {
                if (k.startsWith('claude-dashboard-chat')) {
                  localStorage.removeItem(k)
                }
              }
              toast.success(t('common.chatCleared'))
            }}
          >
            {t('settings.clearChatHistory')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              localStorage.removeItem('claude-dashboard-recent-launches')
              toast.success(t('common.recentCleared'))
            }}
          >
            {t('settings.clearRecentLaunches')}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{t('settings.localDataDesc')}</p>
      </div>

      {/* Import / Export */}
      <ImportExportPage />

      <Separator className="mb-8 mt-8" />

      {/* Info */}
      <div className="rounded-lg border border-border p-4">
        <p className="text-sm font-medium mb-2">Claude Code Dashboard</p>
        <p className="text-xs text-muted-foreground">v0.6.0</p>
        <p className="text-xs text-muted-foreground">
          {locale === 'it' ? 'Configurazione' : 'Configuration'}: ~/.claude/settings.json
        </p>
      </div>
    </div>
  )
}
