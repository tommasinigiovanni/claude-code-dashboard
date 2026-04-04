import { ContextSwitcher } from './ContextSwitcher'

export function TopBar() {
  return (
    <header className="flex items-center justify-between h-14 px-6 border-b border-border bg-background">
      <div className="text-sm text-muted-foreground">Dashboard</div>
      <ContextSwitcher />
    </header>
  )
}
