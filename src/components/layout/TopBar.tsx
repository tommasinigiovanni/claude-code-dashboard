import { useState, useEffect } from 'react'
import { useI18n } from '@/i18n/useI18n'
import { Badge } from '@/components/ui/badge'
import { ContextSwitcher } from './ContextSwitcher'

export function TopBar() {
  const { t } = useI18n()
  const [sshName, setSshName] = useState<string | null>(null)

  // Re-check SSH state periodically (settings are in localStorage)
  useEffect(() => {
    const check = () => {
      const s = JSON.parse(localStorage.getItem('claude-dashboard-settings') || '{}')
      const profile = s.activeSshProfile
        ? (s.sshProfiles || []).find((p: { name: string }) => p.name === s.activeSshProfile)
        : null
      setSshName(profile?.name ?? null)
    }
    check()
    // Listen for storage changes and re-check on interval
    const interval = setInterval(check, 1000)
    window.addEventListener('storage', check)
    return () => { clearInterval(interval); window.removeEventListener('storage', check) }
  }, [])

  return (
    <header className="flex items-center justify-between h-14 px-6 border-b border-border bg-background">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{t('topbar.dashboard')}</span>
        {sshName ? (
          <Badge variant="outline" className="text-xs border-primary/30 text-primary">
            🖥️ {sshName}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs">
            💻 Local
          </Badge>
        )}
      </div>
      <ContextSwitcher />
    </header>
  )
}
