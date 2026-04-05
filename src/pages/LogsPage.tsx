import { useState, useEffect, useRef, useCallback } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

import { toast } from 'sonner'
import { useI18n } from '@/i18n/useI18n'
import { useConfigStore } from '@/store/configStore'
import {
  ScrollTextIcon, RefreshCwIcon, ArrowDownIcon,
  UserIcon, BotIcon, WrenchIcon, MessageSquareIcon,
  FolderIcon, FileTextIcon,
} from 'lucide-react'

interface LogEntry {
  timestamp: string
  entry_type: string
  content: string
  session_id: string
}

type LogFilter = 'all' | 'user' | 'assistant' | 'tool_use'

function formatRelativeTime(timestamp: string, locale: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)

  if (diffSec < 60) return locale === 'it' ? 'ora' : 'just now'
  if (diffMin < 60) return locale === 'it' ? `${diffMin} min fa` : `${diffMin} min ago`
  if (diffHour < 24) return locale === 'it' ? `${diffHour}h fa` : `${diffHour}h ago`
  return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
}

function getEntryIcon(entryType: string) {
  switch (entryType) {
    case 'user': return <UserIcon className="size-3" />
    case 'assistant': return <BotIcon className="size-3" />
    case 'tool_use': return <WrenchIcon className="size-3" />
    default: return <MessageSquareIcon className="size-3" />
  }
}

export function LogsPage() {
  const { t, locale } = useI18n()
  const projectPath = useConfigStore((s) => s.projectPath)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<LogFilter>('all')
  const [showScrollBtn, setShowScrollBtn] = useState(false)
  const feedRef = useRef<HTMLDivElement>(null)

  const loadLogs = async () => {
    setLoading(true)
    try {
      const result = await invoke<LogEntry[]>('read_session_logs', {
        projectPath: projectPath ?? null,
        maxEntries: 200,
      })
      setLogs(result)
    } catch (e) {
      toast.error(`${t('common.error')}: ${e}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
  }, [projectPath])

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [logs])

  const handleScroll = useCallback(() => {
    if (!feedRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = feedRef.current
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 100)
  }, [])

  const scrollToBottom = () => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }

  const filteredLogs = filter === 'all' ? logs : logs.filter((l) => l.entry_type === filter)

  const getEntryStyle = (entryType: string) => {
    switch (entryType) {
      case 'user':
        return 'ml-auto bg-blue-600/20 border-blue-600/30 text-right'
      case 'assistant':
        return 'mr-auto bg-card border-border'
      case 'tool_use':
        return 'mr-auto bg-muted/50 border-muted text-muted-foreground text-xs'
      default:
        return 'mr-auto bg-card border-border'
    }
  }

  const getBadgeVariant = (entryType: string) => {
    switch (entryType) {
      case 'user':
        return 'default' as const
      case 'assistant':
        return 'secondary' as const
      case 'tool_use':
        return 'outline' as const
      default:
        return 'secondary' as const
    }
  }

  const userCount = logs.filter((l) => l.entry_type === 'user').length
  const assistantCount = logs.filter((l) => l.entry_type === 'assistant').length
  const toolCount = logs.filter((l) => l.entry_type === 'tool_use').length

  return (
    <div className="p-6 flex flex-col h-full max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">{t('logs.title')}</h2>
          {logs.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              <FileTextIcon className="size-3 mr-1" />
              {filteredLogs.length} {t('logs.entries')}
            </Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={loadLogs} disabled={loading}>
          <RefreshCwIcon className={`size-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          {t('logs.refresh')}
        </Button>
      </div>

      {projectPath && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
          <FolderIcon className="size-3" />
          <span className="truncate">{projectPath}</span>
        </div>
      )}

      {/* Filter buttons */}
      {logs.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          {([
            { key: 'all' as const, label: t('logs.filterAll'), count: logs.length, icon: <MessageSquareIcon className="size-3" /> },
            { key: 'user' as const, label: t('logs.filterUser'), count: userCount, icon: <UserIcon className="size-3" /> },
            { key: 'assistant' as const, label: t('logs.filterAssistant'), count: assistantCount, icon: <BotIcon className="size-3" /> },
            { key: 'tool_use' as const, label: t('logs.filterTool'), count: toolCount, icon: <WrenchIcon className="size-3" /> },
          ]).map((f) => (
            <Button
              key={f.key}
              variant={filter === f.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f.key)}
              className="gap-1.5"
            >
              {f.icon}
              {f.label}
              <Badge variant={filter === f.key ? 'secondary' : 'outline'} className="text-xs ml-1 px-1.5 py-0">
                {f.count}
              </Badge>
            </Button>
          ))}
        </div>
      )}

      {loading && logs.length === 0 ? (
        <p className="text-muted-foreground">{t('common.loading')}</p>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center flex-1">
          <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <ScrollTextIcon className="size-7 text-muted-foreground/60" />
          </div>
          <p className="text-sm font-medium mb-1">{t('logs.emptyTitle')}</p>
          <p className="text-xs text-muted-foreground max-w-xs">{t('logs.emptyDesc')}</p>
        </div>
      ) : (
        <div className="relative flex-1 min-h-0">
          <div
            ref={feedRef}
            onScroll={handleScroll}
            className="h-full overflow-auto space-y-3 pr-2"
          >
            {filteredLogs.map((entry, i) => (
              <div
                key={`${entry.session_id}-${entry.timestamp}-${i}`}
                className={`max-w-[80%] rounded-lg border p-3 ${getEntryStyle(entry.entry_type)}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={getBadgeVariant(entry.entry_type)} className="text-xs gap-1">
                    {getEntryIcon(entry.entry_type)}
                    {entry.entry_type}
                  </Badge>
                  <span className="text-xs text-muted-foreground" title={new Date(entry.timestamp).toLocaleString(locale)}>
                    {formatRelativeTime(entry.timestamp, locale)}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap break-words">{entry.content}</p>
              </div>
            ))}
          </div>

          {/* Scroll to bottom button */}
          {showScrollBtn && (
            <Button
              variant="secondary"
              size="sm"
              className="absolute bottom-4 right-4 rounded-full shadow-lg gap-1.5"
              onClick={scrollToBottom}
            >
              <ArrowDownIcon className="size-3.5" />
              {t('logs.scrollBottom')}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
