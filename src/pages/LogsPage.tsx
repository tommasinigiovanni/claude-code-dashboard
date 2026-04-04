import { useState, useEffect, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useI18n } from '@/i18n/useI18n'
import { useConfigStore } from '@/store/configStore'

interface LogEntry {
  timestamp: string
  entry_type: string
  content: string
  session_id: string
}

export function LogsPage() {
  const { t, locale } = useI18n()
  const projectPath = useConfigStore((s) => s.projectPath)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(false)
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

  return (
    <div className="p-6 flex flex-col h-full max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">{t('nav.logs')}</h2>
        <Button variant="outline" size="sm" onClick={loadLogs} disabled={loading}>
          {loading ? '...' : locale === 'it' ? 'Aggiorna' : 'Refresh'}
        </Button>
      </div>

      {projectPath && (
        <p className="text-xs text-muted-foreground mb-4 truncate">
          {locale === 'it' ? 'Progetto' : 'Project'}: {projectPath}
        </p>
      )}

      {loading && logs.length === 0 ? (
        <p className="text-muted-foreground">{t('common.loading')}</p>
      ) : logs.length === 0 ? (
        <p className="text-muted-foreground">
          {locale === 'it' ? 'Nessun log trovato.' : 'No logs found.'}
        </p>
      ) : (
        <div
          ref={feedRef}
          className="flex-1 overflow-auto space-y-3 pr-2"
        >
          {logs.map((entry, i) => (
            <div
              key={`${entry.session_id}-${entry.timestamp}-${i}`}
              className={`max-w-[80%] rounded-lg border p-3 ${getEntryStyle(entry.entry_type)}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={getBadgeVariant(entry.entry_type)} className="text-xs">
                  {entry.entry_type}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(entry.timestamp).toLocaleTimeString(locale)}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap break-words">{entry.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
