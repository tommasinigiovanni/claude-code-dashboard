import { useState, useEffect, useRef, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useUiStore, type Page } from '@/store/uiStore'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/i18n/useI18n'

interface CommandItem {
  id: string
  label: string
  category: string
  action: () => void
}

interface TmuxSession {
  name: string
  attached: boolean
  windows: number
  created: string
}

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTmuxAttach?: (name: string, cwd: string | null) => void
}

export function CommandPalette({ open, onOpenChange, onTmuxAttach }: CommandPaletteProps) {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<CommandItem[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const setActivePage = useUiStore((s) => s.setActivePage)

  const navigate = useCallback((page: Page) => {
    setActivePage(page)
    onOpenChange(false)
  }, [setActivePage, onOpenChange])

  useEffect(() => {
    if (!open) {
      setQuery('')
      setSelectedIndex(0)
      return
    }

    // Build command list
    const navItems: CommandItem[] = [
      { id: 'nav-mcp', label: t('nav.mcp'), category: t('palette.navigation'), action: () => navigate('mcp') },
      { id: 'nav-skills', label: t('nav.skills'), category: t('palette.navigation'), action: () => navigate('skills') },
      { id: 'nav-subagents', label: t('nav.subagents'), category: t('palette.navigation'), action: () => navigate('subagents') },
      { id: 'nav-launcher', label: t('nav.launcher'), category: t('palette.navigation'), action: () => navigate('launcher') },
      { id: 'nav-settings', label: t('nav.settings'), category: t('palette.navigation'), action: () => navigate('settings') },
      { id: 'nav-docs', label: t('nav.docs'), category: t('palette.navigation'), action: () => navigate('docs') },
      { id: 'nav-credits', label: t('nav.credits'), category: t('palette.navigation'), action: () => navigate('credits') },
    ]

    // Load tmux sessions
    invoke<TmuxSession[]>('tmux_list_sessions')
      .then((sessions) => {
        const tmuxItems: CommandItem[] = sessions.map((s) => ({
          id: `tmux-${s.name}`,
          label: s.name.replace('claude-', ''),
          category: t('palette.tmuxSessions'),
          action: async () => {
            let cwd: string | null = null
            try {
              cwd = await invoke<string | null>('tmux_session_cwd', { sessionName: s.name })
            } catch { /* ignore */ }
            onTmuxAttach?.(s.name, cwd)
            onOpenChange(false)
          },
        }))
        setItems([...navItems, ...tmuxItems])
      })
      .catch(() => setItems(navItems))

    setTimeout(() => inputRef.current?.focus(), 50)
  }, [open, navigate, onOpenChange, onTmuxAttach, t])

  const filtered = items.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action()
        }
        break
      case 'Escape':
        onOpenChange(false)
        break
    }
  }

  // Group by category
  const grouped = new Map<string, CommandItem[]>()
  for (const item of filtered) {
    const list = grouped.get(item.category) || []
    list.push(item)
    grouped.set(item.category, list)
  }

  let flatIndex = -1

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-lg p-0 overflow-hidden">
        <div className="p-3 border-b border-border">
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('palette.search')}
            className="border-0 focus-visible:ring-0 shadow-none"
          />
        </div>
        <div className="max-h-[300px] overflow-auto p-2">
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">{t('palette.noResults')}</p>
          )}
          {Array.from(grouped.entries()).map(([category, categoryItems]) => (
            <div key={category}>
              <p className="text-xs text-muted-foreground px-2 py-1">{category}</p>
              {categoryItems.map((item) => {
                flatIndex++
                const idx = flatIndex
                return (
                  <button
                    key={item.id}
                    onClick={() => item.action()}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      idx === selectedIndex
                        ? 'bg-accent text-accent-foreground'
                        : 'hover:bg-accent/50'
                    }`}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
