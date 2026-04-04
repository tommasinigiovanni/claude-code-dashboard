import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { useI18n } from '@/i18n/useI18n'

export const SETTINGS_KEY = 'claude-dashboard-settings'

export type TerminalApp = 'chat' | 'Terminal' | 'iTerm' | 'Warp' | 'Alacritty' | 'embedded' | 'custom'

export interface DashboardSettings {
  theme: 'dark' | 'light' | 'system'
  claudePathOverride: string
  terminalApp: TerminalApp
  customTerminalPath: string
  useTmux: boolean
  language: 'it' | 'en'
}

const defaultSettings: DashboardSettings = {
  theme: 'dark',
  claudePathOverride: '',
  terminalApp: 'Terminal',
  customTerminalPath: '',
  useTmux: false,
  language: 'it',
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

const terminalOptionIds: TerminalApp[] = ['chat', 'embedded', 'Terminal', 'iTerm', 'Warp', 'Alacritty', 'custom']

function getTerminalLabel(id: TerminalApp, tFn: (key: string) => string): string {
  switch (id) {
    case 'chat': return 'Chat'
    case 'embedded': return tFn('settings.terminal')
    case 'Terminal': return 'Terminal'
    case 'iTerm': return 'iTerm2'
    case 'Warp': return 'Warp'
    case 'Alacritty': return 'Alacritty'
    case 'custom': return '...'
  }
}

export function SettingsPage() {
  const { t } = useI18n()
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
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">{t('settings.title')}</h2>

      {/* Theme */}
      <div className="space-y-3 mb-8">
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

      {/* Terminal */}
      <div className="space-y-3 mb-8">
        <Label>{t('settings.terminal')}</Label>
        <div className="flex gap-2 flex-wrap">
          {terminalOptionIds.map((id) => (
            <Button
              key={id}
              variant={settings.terminalApp === id ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateSetting('terminalApp', id)}
            >
              {getTerminalLabel(id, t as (key: string) => string)}
            </Button>
          ))}
        </div>
        {settings.terminalApp === 'custom' && (
          <Input
            value={settings.customTerminalPath}
            onChange={(e) => updateSetting('customTerminalPath', e.target.value)}
            placeholder="es. /Applications/Kitty.app"
          />
        )}
        <p className="text-xs text-muted-foreground">
          {t('settings.terminalDesc')}
        </p>
      </div>

      {/* Language */}
      <div className="space-y-3 mb-8">
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

      {/* tmux */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Label>{t('settings.useTmux')}</Label>
          <p className="text-xs text-muted-foreground mt-1">
            {t('settings.tmuxDesc')}
          </p>
        </div>
        <Switch
          checked={settings.useTmux}
          onCheckedChange={(checked) => updateSetting('useTmux', !!checked)}
        />
      </div>

      {/* Claude path override */}
      <div className="space-y-3 mb-8">
        <Label htmlFor="claude-path">{t('settings.claudePath')}</Label>
        <Input
          id="claude-path"
          value={settings.claudePathOverride}
          onChange={(e) => updateSetting('claudePathOverride', e.target.value)}
          placeholder={t('settings.claudePathPlaceholder')}
        />
        <p className="text-xs text-muted-foreground">
          {t('settings.claudePathDesc')}
        </p>
      </div>

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
        <p className="text-xs text-muted-foreground">
          {t('settings.localDataDesc')}
        </p>
      </div>

      {/* Info */}
      <div className="rounded-lg border border-border p-4">
        <p className="text-sm font-medium mb-2">Claude Code Dashboard</p>
        <p className="text-xs text-muted-foreground">Versione 0.1.0</p>
        <p className="text-xs text-muted-foreground">
          Configurazione: ~/.claude/settings.json
        </p>
      </div>
    </div>
  )
}
