import { toast } from 'sonner'
import { useConfigStore } from '@/store/configStore'
import type { McpServerUI } from '@/types/claude'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface McpCardProps {
  mcp: McpServerUI
  onEdit: (mcp: McpServerUI) => void
}

export function McpCard({ mcp, onEdit }: McpCardProps) {
  const removeMcp = useConfigStore((s) => s.removeMcp)

  const handleDelete = async () => {
    try {
      await removeMcp(mcp.id, mcp.scope)
      toast.success(`MCP "${mcp.id}" rimosso`)
    } catch (e) {
      toast.error(`Errore: ${e}`)
    }
  }

  const envKeys = mcp.env ? Object.keys(mcp.env) : []

  return (
    <div className="flex items-start justify-between rounded-lg border border-border p-4 hover:border-border/80 transition-colors">
      <div className="space-y-1.5 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{mcp.id}</span>
          <Badge variant={mcp.scope === 'global' ? 'default' : 'secondary'} className="text-xs">
            {mcp.scope}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground font-mono truncate">
          {mcp.command} {mcp.args?.join(' ')}
        </p>
        {envKeys.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Env: {envKeys.join(', ')}
          </p>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger className="px-2 py-1 rounded-md hover:bg-accent text-muted-foreground">
          ⋯
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(mcp)}>
            Modifica
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={handleDelete}>
            Elimina
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
