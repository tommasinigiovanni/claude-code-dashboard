import { useUiStore, type Page } from '@/store/uiStore'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'

const mainNavItems: { id: Page; label: string; icon: string }[] = [
  { id: 'mcp', label: 'MCP Servers', icon: '🔌' },
  { id: 'skills', label: 'Skills & Plugins', icon: '⚡' },
  { id: 'subagents', label: 'Sub-agents', icon: '🤖' },
  { id: 'launcher', label: 'Launcher', icon: '🚀' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
  { id: 'docs', label: 'Documentazione', icon: '📖' },
]

const bottomNavItems: { id: Page; label: string; icon: string }[] = [
  { id: 'credits', label: 'Credits', icon: '💜' },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { activePage, setActivePage } = useUiStore()

  const renderItem = (item: { id: Page; label: string; icon: string }) => (
    <button
      key={item.id}
      onClick={() => setActivePage(item.id)}
      title={collapsed ? item.label : undefined}
      className={cn(
        'flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm font-medium transition-colors',
        collapsed && 'justify-center px-2',
        activePage === item.id
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
      )}
    >
      <span className="text-base">{item.icon}</span>
      {!collapsed && item.label}
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
          title={collapsed ? 'Espandi sidebar' : 'Comprimi sidebar'}
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
