import { useI18n } from '@/i18n/useI18n'
import { Badge } from '@/components/ui/badge'
import { ContextSwitcher } from './ContextSwitcher'

function getActiveSsh() {
  const s = JSON.parse(localStorage.getItem('claude-dashboard-settings') || '{}')
  return s.activeSshProfile
    ? (s.sshProfiles || []).find((p: { name: string }) => p.name === s.activeSshProfile)
    : null
}

export function TopBar() {
  const { t } = useI18n()
  const ssh = getActiveSsh()

  return (
    <header className="flex items-center justify-between h-14 px-6 border-b border-border bg-background">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{t('topbar.dashboard')}</span>
        {ssh ? (
          <Badge variant="outline" className="text-xs border-primary/30 text-primary">
            🖥️ {ssh.name}
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
