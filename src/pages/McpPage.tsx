import { useState } from 'react'
import { useConfigStore } from '@/store/configStore'
import { useI18n } from '@/i18n/useI18n'
import type { McpServerUI } from '@/types/claude'
import { McpList } from '@/components/mcp/McpList'
import { McpForm } from '@/components/mcp/McpForm'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  ServerIcon, CloudIcon, HardDriveIcon, SearchIcon,
  ChevronDownIcon, ChevronUpIcon, ServerCrashIcon,
} from 'lucide-react'

export function McpPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [editingMcp, setEditingMcp] = useState<McpServerUI | null>(null)
  const [search, setSearch] = useState('')
  const [cloudOpen, setCloudOpen] = useState(true)
  const cloudConnectors = useConfigStore((s) => s.cloudConnectors)
  const mcpServers = useConfigStore((s) => s.mcpServers)
  const { t } = useI18n()

  const cloudCount = cloudConnectors.length
  const localCount = mcpServers.length
  const query = search.toLowerCase()

  const filteredCloud = cloudConnectors.filter((c) =>
    c.name.toLowerCase().includes(query)
  )
  const filteredLocal = mcpServers.filter((m) =>
    m.id.toLowerCase().includes(query)
  )
  const hasResults = filteredCloud.length > 0 || filteredLocal.length > 0
  const hasAny = cloudCount > 0 || localCount > 0

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t('mcp.title')}</h2>
        <Button onClick={() => { setEditingMcp(null); setFormOpen(true) }}>{t('mcp.addMcp')}</Button>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
            <ServerIcon className="size-3.5 text-primary" />
          </div>
          <span className="font-medium">{cloudCount + localCount}</span>
          <span className="text-muted-foreground">total</span>
        </div>
        <Separator orientation="vertical" className="h-5" />
        <div className="flex items-center gap-1.5 text-sm">
          <CloudIcon className="size-3.5 text-muted-foreground" />
          <span className="font-medium">{cloudCount}</span>
          <span className="text-muted-foreground">{t('mcp.statsCloud')}</span>
        </div>
        <Separator orientation="vertical" className="h-5" />
        <div className="flex items-center gap-1.5 text-sm">
          <HardDriveIcon className="size-3.5 text-muted-foreground" />
          <span className="font-medium">{localCount}</span>
          <span className="text-muted-foreground">{t('mcp.statsLocal')}</span>
        </div>
      </div>

      {/* Search */}
      {hasAny && (
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('mcp.searchPlaceholder')}
            className="pl-9"
          />
        </div>
      )}

      {/* Cloud connectors - collapsible card */}
      {filteredCloud.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <button
            className="w-full flex items-center gap-3 p-4 text-left cursor-pointer hover:bg-accent/30 transition-colors"
            onClick={() => setCloudOpen(!cloudOpen)}
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <CloudIcon className="size-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold">{t('mcp.cloudConnectors')}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{filteredCloud.length} connector{filteredCloud.length !== 1 ? 's' : ''}</p>
            </div>
            {cloudOpen ? <ChevronUpIcon className="size-4 text-muted-foreground" /> : <ChevronDownIcon className="size-4 text-muted-foreground" />}
          </button>
          {cloudOpen && (
            <>
              <Separator />
              <div className="p-4 space-y-2">
                {filteredCloud.map((c) => (
                  <div key={c.name} className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
                    <div className="flex items-center gap-3">
                      <CloudIcon className="size-4 text-primary" />
                      <span className="font-medium text-sm">{c.name}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">{t('common.cloud')}</Badge>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Local MCP servers */}
      {(filteredLocal.length > 0 || (!search && localCount === 0)) && (
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3 p-4">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <HardDriveIcon className="size-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold">{t('mcp.localServers')}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{localCount} server{localCount !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <Separator />
          <div className="p-4">
            <McpList onEdit={(mcp) => { setEditingMcp(mcp); setFormOpen(true) }} filterQuery={search} />
          </div>
        </div>
      )}

      {/* No results from search */}
      {search && !hasResults && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <SearchIcon className="size-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">{t('mcp.noResults')}</p>
        </div>
      )}

      {/* Empty state */}
      {!hasAny && !search && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <ServerCrashIcon className="size-7 text-muted-foreground/60" />
          </div>
          <p className="text-sm font-medium mb-1">{t('mcp.noServers')}</p>
          <p className="text-xs text-muted-foreground max-w-xs">{t('mcp.emptyDesc')}</p>
        </div>
      )}

      <McpForm open={formOpen} onOpenChange={setFormOpen} editingMcp={editingMcp} />
    </div>
  )
}
