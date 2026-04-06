import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { useI18n } from '@/i18n/useI18n'
import {
  BarChart3Icon,
  DollarSignIcon,
  HashIcon,
  FolderIcon,
  RefreshCwIcon,
} from 'lucide-react'

interface UsageEntry {
  date: string
  cost_usd: number
  input_tokens: number
  output_tokens: number
  sessions: number
  project: string
}

export function UsagePage() {
  const { t, locale } = useI18n()
  const [entries, setEntries] = useState<UsageEntry[]>([])
  const [loading, setLoading] = useState(true)

  const loadUsage = async () => {
    setLoading(true)
    try {
      const data = await invoke<UsageEntry[]>('read_usage_stats')
      setEntries(data)
    } catch (e) {
      toast.error(`${t('common.error')}: ${e}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUsage() }, [])

  // Aggregations
  const totalCost = entries.reduce((sum, e) => sum + e.cost_usd, 0)
  const totalInput = entries.reduce((sum, e) => sum + e.input_tokens, 0)
  const totalOutput = entries.reduce((sum, e) => sum + e.output_tokens, 0)
  const totalSessions = entries.reduce((sum, e) => sum + e.sessions, 0)

  // Group by project
  const byProject = new Map<string, { cost: number; sessions: number; tokens: number }>()
  for (const e of entries) {
    const prev = byProject.get(e.project) ?? { cost: 0, sessions: 0, tokens: 0 }
    byProject.set(e.project, {
      cost: prev.cost + e.cost_usd,
      sessions: prev.sessions + e.sessions,
      tokens: prev.tokens + e.input_tokens + e.output_tokens,
    })
  }

  // Group by date for chart (last 14 days)
  const byDate = new Map<string, number>()
  for (const e of entries) {
    byDate.set(e.date, (byDate.get(e.date) ?? 0) + e.cost_usd)
  }
  const sortedDates = Array.from(byDate.entries()).sort((a, b) => a[0].localeCompare(b[0])).slice(-14)
  const maxDailyCost = Math.max(...sortedDates.map(([, c]) => c), 0.01)

  const formatCost = (c: number) => c >= 100 ? `$${c.toFixed(0)}` : c >= 1 ? `$${c.toFixed(2)}` : `$${c.toFixed(4)}`
  const formatTokens = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return String(n)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{locale === 'it' ? 'Costi e Utilizzo' : 'Cost & Usage'}</h2>
        <Button variant="outline" onClick={loadUsage}>
          <RefreshCwIcon className="size-4 mr-1.5" />
          {locale === 'it' ? 'Aggiorna' : 'Refresh'}
        </Button>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-2.5 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
            <DollarSignIcon className="size-3.5 text-primary" />
          </div>
          <span className="font-medium">{formatCost(totalCost)}</span>
          <span className="text-muted-foreground">{locale === 'it' ? 'costo totale' : 'total cost'}</span>
        </div>
        <Separator orientation="vertical" className="h-5" />
        <div className="flex items-center gap-1.5 text-sm">
          <HashIcon className="size-3.5 text-muted-foreground" />
          <span className="font-medium">{formatTokens(totalInput + totalOutput)}</span>
          <span className="text-muted-foreground">tokens</span>
        </div>
        <Separator orientation="vertical" className="h-5" />
        <div className="flex items-center gap-1.5 text-sm">
          <BarChart3Icon className="size-3.5 text-muted-foreground" />
          <span className="font-medium">{totalSessions}</span>
          <span className="text-muted-foreground">{locale === 'it' ? 'sessioni' : 'sessions'}</span>
        </div>
      </div>

      {/* Daily cost chart */}
      {sortedDates.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3 p-4">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <BarChart3Icon className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">{locale === 'it' ? 'Costi giornalieri' : 'Daily Costs'}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {locale === 'it' ? 'Ultimi 14 giorni' : 'Last 14 days'}
              </p>
            </div>
          </div>
          <Separator />
          <div className="p-4">
            <div className="flex items-end gap-1" style={{ height: '200px' }}>
              {sortedDates.map(([date, cost]) => {
                const pct = maxDailyCost > 0 ? (cost / maxDailyCost) * 100 : 0
                return (
                  <div key={date} className="flex-1 flex flex-col items-center justify-end h-full" title={`${date}: ${formatCost(cost)}`}>
                    <span className="text-[9px] text-muted-foreground mb-1">${cost.toFixed(0)}</span>
                    <div
                      className="w-full bg-primary rounded-t-sm min-h-[2px] transition-all"
                      style={{ height: `${Math.max(pct, 1)}%` }}
                    />
                  </div>
                )
              })}
            </div>
            <div className="flex gap-1 mt-1">
              {sortedDates.map(([date]) => (
                <div key={date} className="flex-1 text-center">
                  <span className="text-[9px] text-muted-foreground">{date.slice(5)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Breakdown by project */}
      {byProject.size > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3 p-4">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <FolderIcon className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">{locale === 'it' ? 'Per progetto' : 'By Project'}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{byProject.size} {locale === 'it' ? 'progetti' : 'projects'}</p>
            </div>
          </div>
          <Separator />
          <div className="p-4 space-y-2">
            {Array.from(byProject.entries())
              .sort((a, b) => b[1].cost - a[1].cost)
              .map(([project, data]) => (
                <div key={project} className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium truncate block">{project}</span>
                    <div className="flex gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground">{data.sessions} {locale === 'it' ? 'sessioni' : 'sessions'}</span>
                      <span className="text-xs text-muted-foreground">{formatTokens(data.tokens)} tokens</span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs font-mono ml-2">
                    {formatCost(data.cost)}
                  </Badge>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {entries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <BarChart3Icon className="size-7 text-muted-foreground/60" />
          </div>
          <p className="text-sm font-medium mb-1">
            {locale === 'it' ? 'Nessun dato di utilizzo' : 'No usage data'}
          </p>
          <p className="text-xs text-muted-foreground max-w-xs">
            {locale === 'it'
              ? 'I dati di costo appariranno dopo le sessioni di Claude Code.'
              : 'Cost data will appear after Claude Code sessions.'}
          </p>
        </div>
      )}
    </div>
  )
}
