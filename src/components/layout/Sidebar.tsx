import { useUiStore, type Page } from '@/store/uiStore'
import { useI18n } from '@/i18n/useI18n'
import type { TranslationKey } from '@/i18n/translations'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'

const mainNavItems: { id: Page; labelKey: TranslationKey; icon: string }[] = [
  { id: 'mcp', labelKey: 'nav.mcp', icon: '🔌' },
  { id: 'skills', labelKey: 'nav.skills', icon: '⚡' },
  { id: 'subagents', labelKey: 'nav.subagents', icon: '🤖' },
  { id: 'launcher', labelKey: 'nav.launcher', icon: '🚀' },
  { id: 'profiles', labelKey: 'nav.profiles', icon: '📋' },
  { id: 'logs', labelKey: 'nav.logs', icon: '📜' },
  { id: 'health', labelKey: 'nav.health', icon: '🏥' },
  { id: 'settings', labelKey: 'nav.settings', icon: '⚙️' },
]

const bottomNavItems: { id: Page; labelKey: TranslationKey; icon: string }[] = [
  { id: 'docs', labelKey: 'nav.docs', icon: '📖' },
  { id: 'credits', labelKey: 'nav.credits', icon: '💜' },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { activePage, setActivePage } = useUiStore()
  const { t } = useI18n()

  const renderItem = (item: { id: Page; labelKey: TranslationKey; icon: string }) => (
    <button
      key={item.id}
      onClick={() => setActivePage(item.id)}
      title={collapsed ? t(item.labelKey) : undefined}
      className={cn(
        'flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm font-medium transition-colors',
        collapsed && 'justify-center px-2',
        activePage === item.id
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
      )}
    >
      <span className="text-base">{item.icon}</span>
      {!collapsed && t(item.labelKey)}
    </button>
  )

  return (
    <aside className={cn(
      'flex flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-all duration-200',
      collapsed ? 'w-14' : 'w-56'
    )}>
      <div className="flex items-center justify-between px-3 py-4">
        {!collapsed && (
          <h1 className="text-sm font-semibold tracking-tight px-1">Claude Code Dashboard</h1>
        )}
        <button
          onClick={onToggle}
          className="text-sidebar-foreground/50 hover:text-sidebar-foreground p-1 rounded"
        >
          {collapsed ? '▶' : '◀'}
        </button>
      </div>
      <Separator />
      <nav className="flex-1 px-2 py-3 space-y-1">
        {mainNavItems.map(renderItem)}
      </nav>
      <Separator />
      <div className="px-2 py-2">
        {bottomNavItems.map(renderItem)}
      </div>
    </aside>
  )
}
