import { useState, useEffect, useRef } from 'react'
import { healthCheckMcp } from '@/services/api'
import { getSshConfig } from '@/hooks/useSshConfig'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { useI18n } from '@/i18n/useI18n'
import {
  HeartPulseIcon, CheckCircle2Icon, XCircleIcon,
  RefreshCwIcon, ClockIcon, ServerCrashIcon, WifiIcon, WifiOffIcon,
} from 'lucide-react'

interface McpHealthResult {
  name: string
  connected: boolean
  status: string
}

function formatRelativeTime(date: Date, locale: string): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)

  if (diffSec < 10) return locale === 'it' ? 'ora' : 'just now'
  if (diffSec < 60) return locale === 'it' ? `${diffSec}s fa` : `${diffSec}s ago`
  if (diffMin < 60) return locale === 'it' ? `${diffMin} min fa` : `${diffMin} min ago`
  return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
}

export function HealthPage() {
  const { t, locale } = useI18n()
  const [results, setResults] = useState<McpHealthResult[]>([])
  const [loading, setLoading] = useState(false)
  const [hasRun, setHasRun] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const runCheck = async () => {
    setLoading(true)
    try {
      const sshConfig = getSshConfig()
      const data = await healthCheckMcp(sshConfig)
      setResults(data.map(([name, connected, status]) => ({ name, connected, status })))
      setHasRun(true)
      setLastCheck(new Date())
    } catch (e) {
      toast.error(`${t('common.error')}: ${e}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runCheck()
  }, [])

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(runCheck, 30000) // 30s
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [autoRefresh])

  const connectedCount = results.filter((r) => r.connected).length
  const disconnectedCount = results.filter((r) => !r.connected).length

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t('health.title')}</h2>
        <Button variant="outline" size="sm" onClick={runCheck} disabled={loading}>
          <RefreshCwIcon className={`size-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? t('health.checking') : t('health.runCheck')}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">{t('health.description')}</p>

      {/* Stats / summary bar */}
      {hasRun && results.length > 0 && (
        <div className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
              <HeartPulseIcon className="size-3.5 text-primary" />
            </div>
            <span className="font-medium">{results.length}</span>
            <span className="text-muted-foreground">servers</span>
          </div>
          <Separator orientation="vertical" className="h-5" />
          <div className="flex items-center gap-1.5 text-sm">
            <CheckCircle2Icon className="size-3.5 text-green-500" />
            <span className="font-medium">{connectedCount}</span>
            <span className="text-muted-foreground">{t('health.statsConnected')}</span>
          </div>
          {disconnectedCount > 0 && (
            <>
              <Separator orientation="vertical" className="h-5" />
              <div className="flex items-center gap-1.5 text-sm">
                <XCircleIcon className="size-3.5 text-red-500" />
                <span className="font-medium">{disconnectedCount}</span>
                <span className="text-muted-foreground">{t('health.statsDisconnected')}</span>
              </div>
            </>
          )}
          <div className="ml-auto flex items-center gap-4">
            {lastCheck && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ClockIcon className="size-3" />
                {t('health.lastCheck')}: {formatRelativeTime(lastCheck, locale)}
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t('health.autoRefresh')}</span>
              <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {loading && !hasRun ? (
        <p className="text-muted-foreground">{t('common.loading')}</p>
      ) : results.length === 0 && hasRun ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <ServerCrashIcon className="size-7 text-muted-foreground/60" />
          </div>
          <p className="text-sm font-medium mb-1">{t('health.noServers')}</p>
          <p className="text-xs text-muted-foreground max-w-xs">{t('health.noServersDesc')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {results.map((mcp) => (
            <div
              key={mcp.name}
              className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  mcp.connected
                    ? 'bg-green-500/10'
                    : 'bg-red-500/10'
                }`}>
                  {mcp.connected
                    ? <WifiIcon className="size-5 text-green-500" />
                    : <WifiOffIcon className="size-5 text-red-500" />
                  }
                </div>
                <div>
                  <span className="font-medium">{mcp.name}</span>
                  <p className="text-sm text-muted-foreground">{mcp.status}</p>
                </div>
              </div>
              <Badge variant={mcp.connected ? 'default' : 'destructive'}>
                {mcp.connected ? t('health.connected') : t('health.disconnected')}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
