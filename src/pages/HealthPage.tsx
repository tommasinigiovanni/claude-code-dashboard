import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useI18n } from '@/i18n/useI18n'

interface McpHealthResult {
  name: string
  connected: boolean
  status: string
}

export function HealthPage() {
  const { t, locale } = useI18n()
  const [results, setResults] = useState<McpHealthResult[]>([])
  const [loading, setLoading] = useState(false)
  const [hasRun, setHasRun] = useState(false)

  const runCheck = async () => {
    setLoading(true)
    try {
      const dashSettings = JSON.parse(localStorage.getItem('claude-dashboard-settings') || '{}')
      const sshProfile = dashSettings.activeSshProfile
        ? (dashSettings.sshProfiles || []).find((p: { name: string }) => p.name === dashSettings.activeSshProfile)
        : null

      let data: [string, boolean, string][]
      if (sshProfile) {
        data = await invoke<[string, boolean, string][]>('ssh_health_check_mcp', {
          config: { name: sshProfile.name, host: sshProfile.host, port: sshProfile.port, user: sshProfile.user, key_path: sshProfile.keyPath || null },
        })
      } else {
        data = await invoke<[string, boolean, string][]>('health_check_mcp')
      }
      setResults(data.map(([name, connected, status]) => ({ name, connected, status })))
      setHasRun(true)
    } catch (e) {
      toast.error(`${t('common.error')}: ${e}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runCheck()
  }, [])

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{t('nav.health')}</h2>
        <Button variant="outline" size="sm" onClick={runCheck} disabled={loading}>
          {loading
            ? locale === 'it' ? 'Verifica in corso...' : 'Checking...'
            : locale === 'it' ? 'Esegui check' : 'Run check'}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        {locale === 'it'
          ? 'Verifica lo stato di connessione dei server MCP configurati.'
          : 'Check the connection status of configured MCP servers.'}
      </p>

      {loading && !hasRun ? (
        <p className="text-muted-foreground">{t('common.loading')}</p>
      ) : results.length === 0 && hasRun ? (
        <p className="text-muted-foreground">
          {locale === 'it' ? 'Nessun server MCP configurato.' : 'No MCP servers configured.'}
        </p>
      ) : (
        <div className="space-y-3">
          {results.map((mcp) => (
            <div
              key={mcp.name}
              className="rounded-lg border border-border p-4 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{mcp.connected ? '🟢' : '🔴'}</span>
                <div>
                  <span className="font-medium">{mcp.name}</span>
                  <p className="text-sm text-muted-foreground">{mcp.status}</p>
                </div>
              </div>
              <Badge variant={mcp.connected ? 'default' : 'destructive'}>
                {mcp.connected
                  ? locale === 'it' ? 'Connesso' : 'Connected'
                  : locale === 'it' ? 'Disconnesso' : 'Disconnected'}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
