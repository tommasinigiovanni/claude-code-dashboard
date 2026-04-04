import { useState } from 'react'
import { useConfigStore } from '@/store/configStore'
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

  const handleAdd = () => {
    setEditingMcp(null)
    setFormOpen(true)
  }

  const handleEdit = (mcp: McpServerUI) => {
    setEditingMcp(mcp)
    setFormOpen(true)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">MCP Servers</h2>
        <Button onClick={handleAdd}>+ Aggiungi MCP</Button>
      </div>

      {/* Cloud connectors */}
      {cloudConnectors.length > 0 && (
        <>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Cloud Connectors (claude.ai)</h3>
          <div className="space-y-2 mb-6">
            {cloudConnectors.map((connector) => (
              <div
                key={connector.name}
                className="flex items-center justify-between rounded-lg border border-border p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="text-base">☁️</span>
                  <span className="font-medium">{connector.name}</span>
                </div>
                <Badge variant="outline" className="text-xs">cloud</Badge>
              </div>
            ))}
          </div>
          <Separator className="mb-6" />
        </>
      )}

      {/* Local MCP servers */}
      <h3 className="text-sm font-medium text-muted-foreground mb-3">MCP Servers Locali</h3>
      <McpList onEdit={handleEdit} />

      <McpForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editingMcp={editingMcp}
      />
    </div>
  )
}
