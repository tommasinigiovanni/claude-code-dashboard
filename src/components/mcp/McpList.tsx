import { useConfigStore } from '@/store/configStore'
import { useI18n } from '@/i18n/useI18n'
import type { McpServerUI } from '@/types/claude'
import { McpCard } from './McpCard'

interface McpListProps {
  onEdit: (mcp: McpServerUI) => void
  filterQuery?: string
}

export function McpList({ onEdit, filterQuery }: McpListProps) {
  const mcpServers = useConfigStore((s) => s.mcpServers)
  const { t } = useI18n()

  const filtered = filterQuery
    ? mcpServers.filter((m) => m.id.toLowerCase().includes(filterQuery.toLowerCase()))
    : mcpServers

  if (filtered.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center">{t('mcp.noServers')}</p>
    )
  }

  return (
    <div className="space-y-3">
      {filtered.map((mcp) => (
        <McpCard key={`${mcp.scope}-${mcp.id}`} mcp={mcp} onEdit={onEdit} />
      ))}
    </div>
  )
}
