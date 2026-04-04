import { type ReactNode } from 'react'
import { useUiStore, type Page } from '@/store/uiStore'
import { useI18n } from '@/i18n/useI18n'
import type { TranslationKey } from '@/i18n/translations'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import {
  ServerIcon,
  ZapIcon,
  BotIcon,
  RocketIcon,
  LayersIcon,
  ScrollTextIcon,
  ActivityIcon,
  SettingsIcon,
  BookOpenIcon,
  HeartIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
} from 'lucide-react'

const mainNavItems: { id: Page; labelKey: TranslationKey; icon: ReactNode }[] = [
  { id: 'mcp', labelKey: 'nav.mcp', icon: <ServerIcon className="size-4" /> },
  { id: 'skills', labelKey: 'nav.skills', icon: <ZapIcon className="size-4" /> },
  { id: 'subagents', labelKey: 'nav.subagents', icon: <BotIcon className="size-4" /> },
  { id: 'launcher', labelKey: 'nav.launcher', icon: <RocketIcon className="size-4" /> },
  { id: 'profiles', labelKey: 'nav.profiles', icon: <LayersIcon className="size-4" /> },
  { id: 'logs', labelKey: 'nav.logs', icon: <ScrollTextIcon className="size-4" /> },
  { id: 'health', labelKey: 'nav.health', icon: <ActivityIcon className="size-4" /> },
  { id: 'settings', labelKey: 'nav.settings', icon: <SettingsIcon className="size-4" /> },
]

const bottomNavItems: { id: Page; labelKey: TranslationKey; icon: ReactNode }[] = [
  { id: 'docs', labelKey: 'nav.docs', icon: <BookOpenIcon className="size-4" /> },
  { id: 'credits', labelKey: 'nav.credits', icon: <HeartIcon className="size-4" /> },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { activePage, setActivePage } = useUiStore()
  const { t } = useI18n()

  const renderItem = (item: { id: Page; labelKey: TranslationKey; icon: ReactNode }) => (
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
      {item.icon}
      {!collapsed && t(item.labelKey)}
    </button>
  )

  return (
    <aside className={cn(
      'flex flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-all duration-200',
      collapsed ? 'w-14' : 'w-56'
    )}>
      <div className={cn('flex flex-col px-3 pt-4 pb-2', collapsed && 'items-center')}>
        {!collapsed ? (
          <>
            <div className="flex items-center justify-between mb-2">
              <img src="/icons.svg" alt="" className="w-8 h-8 hidden" />
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center border border-primary/20">
                <span className="text-[10px] font-bold text-primary tracking-tighter">CCD</span>
              </div>
              <div className="flex-1" />
              <button
                onClick={onToggle}
                className="text-sidebar-foreground/50 hover:text-sidebar-foreground p-1 rounded"
              >
                <PanelLeftCloseIcon className="size-4" />
              </button>
            </div>
            <h1 className="text-sm font-semibold tracking-tight px-1">Claude Code Dashboard</h1>
          </>
        ) : (
          <>
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center border border-primary/20 mb-2">
              <span className="text-[9px] font-bold text-primary tracking-tighter">CCD</span>
            </div>
            <button
              onClick={onToggle}
              className="text-sidebar-foreground/50 hover:text-sidebar-foreground p-1 rounded"
            >
              <PanelLeftOpenIcon className="size-4" />
            </button>
          </>
        )}
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
