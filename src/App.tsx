import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { useUiStore } from '@/store/uiStore'
import { useConfigStore } from '@/store/configStore'
import { useConfig } from '@/hooks/useConfig'
import { McpPage } from '@/pages/McpPage'
import { SkillsPage } from '@/pages/SkillsPage'
import { SubagentsPage } from '@/pages/SubagentsPage'
import { LauncherPage } from '@/pages/LauncherPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { DocsPage } from '@/pages/DocsPage'
import { CreditsPage } from '@/pages/CreditsPage'
import { CommandPalette } from '@/components/CommandPalette'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'

function MainContent() {
  const activePage = useUiStore((s) => s.activePage)
  const isLoading = useConfigStore((s) => s.isLoading)
  const error = useConfigStore((s) => s.error)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Caricamento configurazione…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <p className="text-destructive font-medium">Errore</p>
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
    case 'launcher':
      return <LauncherPage />
    case 'settings':
      return <SettingsPage />
    case 'docs':
      return <DocsPage />
    case 'credits':
      return <CreditsPage />
  }
}

function App() {
  useConfig()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const setActivePage = useUiStore((s) => s.setActivePage)

  // Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen((open) => !open)
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
      <Toaster />
    </TooltipProvider>
  )
}

export default App
