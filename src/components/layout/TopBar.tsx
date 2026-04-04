import { useI18n } from '@/i18n/useI18n'
import { ContextSwitcher } from './ContextSwitcher'

export function TopBar() {
  const { t } = useI18n()
  return (
    <header className="flex items-center justify-between h-14 px-6 border-b border-border bg-background">
      <div className="text-sm text-muted-foreground">{t('topbar.dashboard')}</div>
      <ContextSwitcher />
    </header>
  )
}
