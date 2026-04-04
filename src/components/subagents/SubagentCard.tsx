import { toast } from 'sonner'
import { useConfigStore } from '@/store/configStore'
import { useI18n } from '@/i18n/useI18n'
import type { SubAgentUI } from '@/types/claude'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface SubagentCardProps {
  agent: SubAgentUI
  onEdit: (agent: SubAgentUI) => void
}

export function SubagentCard({ agent, onEdit }: SubagentCardProps) {
  const removeSubAgent = useConfigStore((s) => s.removeSubAgent)
  const { t } = useI18n()

  const handleDelete = async () => {
    try {
      await removeSubAgent(agent.id, agent.scope)
      toast.success(`Sub-agent "${agent.id}" ${t('common.removed')}`)
    } catch (e) {
      toast.error(`${t('common.error')}: ${e}`)
    }
  }

  return (
    <div className="flex items-start justify-between rounded-lg border border-border p-4">
      <div className="space-y-1.5 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{agent.id}</span>
          <Badge variant={agent.scope === 'global' ? 'default' : 'secondary'} className="text-xs">
            {agent.scope === 'global' ? t('common.global') : t('common.project')}
          </Badge>
          {agent.enabled === false && (
            <Badge variant="outline" className="text-xs">{t('skills.disabled')}</Badge>
          )}
        </div>
        {agent.description && <p className="text-sm text-muted-foreground">{agent.description}</p>}
        <p className="text-xs text-muted-foreground font-mono truncate">
          {agent.prompt.slice(0, 100)}{agent.prompt.length > 100 ? '…' : ''}
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger className="px-2 py-1 rounded-md hover:bg-accent text-muted-foreground">⋯</DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(agent)}>{t('mcp.edit')}</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={handleDelete}>{t('mcp.delete')}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
