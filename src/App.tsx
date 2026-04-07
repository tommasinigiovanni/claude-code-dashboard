import { useState, useEffect } from 'react'
import { autoBackup, telegramBotStatus, telegramStartBot } from '@/services/api'
import { getSettings } from '@/pages/SettingsPage'
import { OnboardingWizard, useOnboarding } from '@/components/OnboardingWizard'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { useUiStore, type Page } from '@/store/uiStore'
import { useConfigStore } from '@/store/configStore'
import { useConfig } from '@/hooks/useConfig'
import { McpPage } from '@/pages/McpPage'
import { SkillsPage } from '@/pages/SkillsPage'
import { SubagentsPage } from '@/pages/SubagentsPage'
import { LauncherPage } from '@/pages/LauncherPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { DocsPage } from '@/pages/DocsPage'
import { CreditsPage } from '@/pages/CreditsPage'
import { ProfilesPage } from '@/pages/ProfilesPage'
import { LogsPage } from '@/pages/LogsPage'
import { HealthPage } from '@/pages/HealthPage'
import { ChangelogPage } from '@/pages/ChangelogPage'
import { HooksPage } from '@/pages/HooksPage'
import { UsagePage } from '@/pages/UsagePage'
import { ClaudeMdPage } from '@/pages/ClaudeMdPage'
import { VerificationPage } from '@/pages/VerificationPage'
import { LearningPage } from '@/pages/LearningPage'
import { CommandPalette } from '@/components/CommandPalette'
import { useI18n } from '@/i18n/useI18n'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'

function MainContent() {
  const { t } = useI18n()
  const activePage = useUiStore((s) => s.activePage)
  const isLoading = useConfigStore((s) => s.isLoading)
  const error = useConfigStore((s) => s.error)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <p className="text-destructive font-medium">{t('common.error')}</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  switch (activePage) {
    case 'mcp':
      return <McpPage />
    case 'skills':
      return <SkillsPage />
    case 'subagents':
      return <SubagentsPage />
    case 'hooks':
      return <HooksPage />
    case 'usage':
      return <UsagePage />
    case 'claudemd':
      return <ClaudeMdPage />
    case 'launcher':
      return <LauncherPage />
    case 'settings':
      return <SettingsPage />
    case 'profiles':
      return <ProfilesPage />
    case 'logs':
      return <LogsPage />
    case 'health':
      return <HealthPage />
    case 'docs':
      return <DocsPage />
    case 'changelog':
      return <ChangelogPage />
    case 'credits':
      return <CreditsPage />
    case 'verification':
      return <VerificationPage />
    case 'learning':
      return <LearningPage />
  }
}

function App() {
  useConfig()
  const { showOnboarding, markDone } = useOnboarding()
  const [onboardingVisible, setOnboardingVisible] = useState(showOnboarding)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const setActivePage = useUiStore((s) => s.setActivePage)

  // Auto-backup on app start
  useEffect(() => {
    autoBackup().catch(() => {})
  }, [])

  // Auto-start Telegram bot if configured
  useEffect(() => {
    const settings = getSettings()
    if (settings.telegramBotToken) {
      telegramBotStatus().then((s) => {
        if (!s.running) {
          const chatId = settings.telegramChatId ? parseInt(settings.telegramChatId) : null
          telegramStartBot({
            botToken: settings.telegramBotToken,
            allowedChatId: chatId || null,
            projectPath: null,
            autoApprove: false,
          }).catch(() => {})
        }
      }).catch(() => {})
    }
  }, [])

  // Cmd+K shortcut + page shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen((open) => !open)
      }
      if (e.metaKey && e.key >= '1' && e.key <= '8') {
        e.preventDefault()
        const pages: Page[] = ['launcher', 'mcp', 'skills', 'subagents', 'profiles', 'logs', 'health', 'settings']
        const idx = parseInt(e.key) - 1
        if (idx < pages.length) setActivePage(pages[idx])
      }
      // Cmd+/- for font size
      if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        const html = document.documentElement
        const current = parseFloat(getComputedStyle(html).fontSize)
        html.style.fontSize = `${Math.min(current + 1, 24)}px`
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '-') {
        e.preventDefault()
        const html = document.documentElement
        const current = parseFloat(getComputedStyle(html).fontSize)
        html.style.fontSize = `${Math.max(current - 1, 10)}px`
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '0') {
        e.preventDefault()
        document.documentElement.style.fontSize = ''
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleTmuxAttach = (name: string, cwd: string | null) => {
    window.__tmuxAttach = { name, cwd }
    setActivePage('launcher')
    // Dispatch event to notify LauncherPage even if already on that page
    window.dispatchEvent(new CustomEvent('tmux-attach', { detail: { name, cwd } }))
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-background text-foreground">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <div className="flex flex-col flex-1 overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-auto">
            <MainContent />
          </main>
        </div>
      </div>
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onTmuxAttach={handleTmuxAttach}
      />
      {onboardingVisible && (
        <OnboardingWizard onComplete={() => { markDone(); setOnboardingVisible(false) }} />
      )}
      <Toaster />
    </TooltipProvider>
  )
}

export default App
