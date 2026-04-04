import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'

export const SETTINGS_KEY = 'claude-dashboard-settings'

export type TerminalApp = 'chat' | 'Terminal' | 'iTerm' | 'Warp' | 'Alacritty' | 'embedded' | 'custom'

export interface DashboardSettings {
  theme: 'dark' | 'light' | 'system'
  claudePathOverride: string
  terminalApp: TerminalApp
  customTerminalPath: string
  useTmux: boolean
}

const defaultSettings: DashboardSettings = {
  theme: 'dark',
  claudePathOverride: '',
  terminalApp: 'Terminal',
  customTerminalPath: '',
  useTmux: false,
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

const terminalOptions: { id: TerminalApp; label: string }[] = [
  { id: 'chat', label: 'Chat' },
  { id: 'embedded', label: 'Terminale' },
  { id: 'Terminal', label: 'Terminal' },
  { id: 'iTerm', label: 'iTerm2' },
  { id: 'Warp', label: 'Warp' },
  { id: 'Alacritty', label: 'Alacritty' },
  { id: 'custom', label: 'Altro…' },
]

export function SettingsPage() {
  const [settings, setSettings] = useState<DashboardSettings>(getSettings)

  useEffect(() => {
    applyTheme(settings.theme)
  }, [settings.theme])

  const updateSetting = <K extends keyof DashboardSettings>(key: K, value: DashboardSettings[K]) => {
    const updated = { ...settings, [key]: value }
    setSettings(updated)
    saveSettings(updated)
    toast.success('Impostazione salvata')
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Impostazioni</h2>

      {/* Theme */}
      <div className="space-y-3 mb-8">
        <Label>Tema</Label>
        <div className="flex gap-2">
          {(['dark', 'light', 'system'] as const).map((t) => (
            <Button
              key={t}
              variant={settings.theme === t ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateSetting('theme', t)}
            >
              {t === 'dark' ? '🌙 Dark' : t === 'light' ? '☀️ Light' : '💻 Sistema'}
            </Button>
          ))}
        </div>
      </div>

      {/* Terminal */}
      <div className="space-y-3 mb-8">
        <Label>Terminale</Label>
        <div className="flex gap-2 flex-wrap">
          {terminalOptions.map((t) => (
            <Button
              key={t.id}
              variant={settings.terminalApp === t.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateSetting('terminalApp', t.id)}
            >
              {t.label}
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
          Terminale usato per avviare Claude Code dal Launcher.
        </p>
      </div>

      {/* tmux */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Label>Usa tmux</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Le sessioni Claude Code persistono anche chiudendo la dashboard.
          </p>
        </div>
        <Switch
          checked={settings.useTmux}
          onCheckedChange={(checked) => updateSetting('useTmux', !!checked)}
        />
      </div>

      {/* Claude path override */}
      <div className="space-y-3 mb-8">
        <Label htmlFor="claude-path">Percorso Claude Code (override)</Label>
        <Input
          id="claude-path"
          value={settings.claudePathOverride}
          onChange={(e) => updateSetting('claudePathOverride', e.target.value)}
          placeholder="Lascia vuoto per usare il PATH di sistema"
        />
        <p className="text-xs text-muted-foreground">
          Se Claude Code non viene trovato automaticamente, specifica il percorso completo qui.
        </p>
      </div>

      {/* Storage */}
      <div className="space-y-3 mb-8">
        <Label>Dati locali</Label>
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
              toast.success('Cronologia chat eliminata')
            }}
          >
            Pulisci cronologia chat
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              localStorage.removeItem('claude-dashboard-recent-launches')
              toast.success('Avvii recenti eliminati')
            }}
          >
            Pulisci avvii recenti
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Elimina i dati salvati localmente (chat, avvii recenti). Le configurazioni Claude Code non vengono toccate.
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
