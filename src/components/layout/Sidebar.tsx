import { type ReactNode, useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { getSshConfig } from '@/hooks/useSshConfig'
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
  ClockIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  WebhookIcon,
  BarChart3Icon,
  FileEditIcon,
  PlayCircleIcon,
  BrainIcon,
} from 'lucide-react'

type NavItem = { id: Page; labelKey: TranslationKey; icon: ReactNode }
type NavSection = NavItem[]

const navSections: NavSection[] = [
  // Launcher first
  [
    { id: 'launcher', labelKey: 'nav.launcher', icon: <RocketIcon className="size-4" /> },
  ],
  // Core management
  [
    { id: 'mcp', labelKey: 'nav.mcp', icon: <ServerIcon className="size-4" /> },
    { id: 'skills', labelKey: 'nav.skills', icon: <ZapIcon className="size-4" /> },
    { id: 'subagents', labelKey: 'nav.subagents', icon: <BotIcon className="size-4" /> },
    { id: 'hooks', labelKey: 'nav.hooks' as TranslationKey, icon: <WebhookIcon className="size-4" /> },
    { id: 'usage', labelKey: 'nav.usage' as TranslationKey, icon: <BarChart3Icon className="size-4" /> },
    { id: 'claudemd', labelKey: 'nav.claudemd' as TranslationKey, icon: <FileEditIcon className="size-4" /> },
  ],
  // Tools & monitoring
  [
    { id: 'verification', labelKey: 'nav.verification' as TranslationKey, icon: <PlayCircleIcon className="size-4" /> },
    { id: 'learning', labelKey: 'nav.learning' as TranslationKey, icon: <BrainIcon className="size-4" /> },
    { id: 'profiles', labelKey: 'nav.profiles', icon: <LayersIcon className="size-4" /> },
    { id: 'logs', labelKey: 'nav.logs', icon: <ScrollTextIcon className="size-4" /> },
    { id: 'health', labelKey: 'nav.health', icon: <ActivityIcon className="size-4" /> },
    { id: 'settings', labelKey: 'nav.settings', icon: <SettingsIcon className="size-4" /> },
  ],
]

const bottomNavItems: NavItem[] = [
  { id: 'docs', labelKey: 'nav.docs', icon: <BookOpenIcon className="size-4" /> },
  { id: 'changelog', labelKey: 'nav.changelog' as TranslationKey, icon: <ClockIcon className="size-4" /> },
  { id: 'credits', labelKey: 'nav.credits', icon: <HeartIcon className="size-4" /> },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { activePage, setActivePage } = useUiStore()
  const { t } = useI18n()
  const [hasActiveSessions, setHasActiveSessions] = useState(false)

  // Check for active tmux sessions periodically
  useEffect(() => {
    const check = async () => {
      try {
        const ssh = getSshConfig()
        if (ssh) {
          const data = await invoke<[string, boolean, number, string][]>('ssh_tmux_list_sessions', { config: ssh })
          setHasActiveSessions(data.length > 0)
        } else {
          const sessions = await invoke<{ name: string }[]>('tmux_list_sessions')
          setHasActiveSessions(sessions.length > 0)
        }
      } catch { setHasActiveSessions(false) }
    }
    check()
    const interval = setInterval(check, 15000)
    return () => clearInterval(interval)
  }, [])

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
      <span className="relative">
        {item.icon}
        {item.id === 'launcher' && hasActiveSessions && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full" />
        )}
      </span>
      {!collapsed && t(item.labelKey)}
    </button>
  )

  return (
    <aside className={cn(
      'flex flex-col border-r border-border bg-sidebar text-sidebar-foreground transition-all duration-200',
      collapsed ? 'w-14' : 'w-56'
    )}>
      <div className={cn('relative flex flex-col px-3 pt-4 pb-2', collapsed && 'items-center')}>
        {!collapsed ? (
          <>
            <div className="flex flex-col items-center">
              <img src="/app-icon.png" alt="CCD" className="w-12 h-12 rounded-xl mb-1.5" />
              <h1 className="text-xs font-semibold tracking-tight text-center leading-tight">Claude Code<br/>Dashboard</h1>
            </div>
            <button
              onClick={onToggle}
              className="absolute top-3 right-2 text-sidebar-foreground/30 hover:text-sidebar-foreground p-1 rounded"
            >
              <PanelLeftCloseIcon className="size-3.5" />
            </button>
          </>
        ) : (
          <>
            <img src="/app-icon.png" alt="CCD" className="w-10 h-10 rounded-xl mb-2" />
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
        {navSections.map((section, i) => (
          <div key={i}>
            {i > 0 && <Separator className="my-2" />}
            {section.map(renderItem)}
          </div>
        ))}
      </nav>
      <Separator />
      <div className="px-2 py-2">
        {bottomNavItems.map(renderItem)}
      </div>
    </aside>
  )
}
