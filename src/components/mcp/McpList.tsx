import { useConfigStore } from '@/store/configStore'
import { useI18n } from '@/i18n/useI18n'
import type { McpServerUI } from '@/types/claude'
import { McpCard } from './McpCard'

interface McpListProps {
  onEdit: (mcp: McpServerUI) => void
}

export function McpList({ onEdit }: McpListProps) {
  const mcpServers = useConfigStore((s) => s.mcpServers)
  const { t } = useI18n()

  if (mcpServers.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center">{t('mcp.noServers')}</p>
    )
  }

  return (
    <div className="space-y-3">
      {mcpServers.map((mcp) => (
        <McpCard key={`${mcp.scope}-${mcp.id}`} mcp={mcp} onEdit={onEdit} />
      ))}
    </div>
  )
}
