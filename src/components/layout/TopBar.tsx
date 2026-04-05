import { useState, useEffect } from 'react'
import { useI18n } from '@/i18n/useI18n'
import { getSshConfig } from '@/hooks/useSshConfig'
import { Badge } from '@/components/ui/badge'
import { ContextSwitcher } from './ContextSwitcher'

export function TopBar() {
  const { t } = useI18n()
  const [sshName, setSshName] = useState<string | null>(null)

  // Re-check SSH state on settings change
  useEffect(() => {
    const check = () => setSshName(getSshConfig()?.name ?? null)
    check()
    window.addEventListener('settings-changed', check)
    return () => window.removeEventListener('settings-changed', check)
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
