import { useState } from 'react'
import { useConfigStore } from '@/store/configStore'
import { useI18n } from '@/i18n/useI18n'
import type { McpServerUI } from '@/types/claude'
import { McpList } from '@/components/mcp/McpList'
import { McpForm } from '@/components/mcp/McpForm'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export function McpPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [editingMcp, setEditingMcp] = useState<McpServerUI | null>(null)
  const cloudConnectors = useConfigStore((s) => s.cloudConnectors)
  const { t } = useI18n()

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{t('mcp.title')}</h2>
        <Button onClick={() => { setEditingMcp(null); setFormOpen(true) }}>{t('mcp.addMcp')}</Button>
      </div>

      {cloudConnectors.length > 0 && (
        <>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">{t('mcp.cloudConnectors')}</h3>
          <div className="space-y-2 mb-6">
            {cloudConnectors.map((c) => (
              <div key={c.name} className="flex items-center justify-between rounded-lg border border-border p-4">
                <div className="flex items-center gap-3">
                  <span className="text-base">☁️</span>
                  <span className="font-medium">{c.name}</span>
                </div>
                <Badge variant="outline" className="text-xs">{t('common.cloud')}</Badge>
              </div>
            ))}
          </div>
          <Separator className="mb-6" />
        </>
      )}

      <h3 className="text-sm font-medium text-muted-foreground mb-3">{t('mcp.localServers')}</h3>
      <McpList onEdit={(mcp) => { setEditingMcp(mcp); setFormOpen(true) }} />
      <McpForm open={formOpen} onOpenChange={setFormOpen} editingMcp={editingMcp} />
    </div>
  )
}
