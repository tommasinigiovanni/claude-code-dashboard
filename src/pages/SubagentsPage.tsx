import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { toast } from 'sonner'
import { useConfigStore } from '@/store/configStore'
import type { SubAgentUI, LocalAgent } from '@/types/claude'
import { SubagentCard } from '@/components/subagents/SubagentCard'
import { SubagentForm } from '@/components/subagents/SubagentForm'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useI18n } from '@/i18n/useI18n'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

function CustomAgentCard({
  agent,
  onEdit,
  onDelete,
}: {
  agent: LocalAgent
  onEdit: (agent: LocalAgent) => void
  onDelete: (agent: LocalAgent) => void
}) {
  const { t } = useI18n()
  return (
    <div className="flex items-start justify-between rounded-lg border border-border p-4">
      <div className="space-y-1 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{agent.name}</span>
          <Badge variant="outline" className="text-xs">
            {agent.plugin}
          </Badge>
        </div>
        {agent.description && (
          <p className="text-sm text-muted-foreground truncate">{agent.description}</p>
        )}
        <p className="text-xs text-muted-foreground font-mono truncate">{agent.path}</p>
      </div>
      {agent.plugin === 'custom' && (
        <DropdownMenu>
          <DropdownMenuTrigger className="px-2 py-1 rounded-md hover:bg-accent text-muted-foreground">
            ⋯
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(agent)}>
              {t('mcp.edit')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(agent)}>
              {t('mcp.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

function AgentFileEditor({
  open,
  onOpenChange,
  agent,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  agent: LocalAgent | null
}) {
  const { t } = useI18n()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const loadConfigs = useConfigStore((s) => s.loadConfigs)

  const loadContent = async () => {
    if (!agent) return
    setLoading(true)
    try {
      const text = await invoke<string>('read_agent_file', { path: agent.path })
      setContent(text)
    } catch (e) {
      toast.error(`${t('common.error')}: ${e}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!agent) return
    setSaving(true)
    try {
      await invoke('write_agent_file', { path: agent.path, content })
      toast.success(`Agent "${agent.name}" ${t('common.updated')}`)
      onOpenChange(false)
      await loadConfigs()
    } catch (e) {
      toast.error(`${t('common.error')}: ${e}`)
    } finally {
      setSaving(false)
    }
  }

  // Load content when dialog opens
  if (open && !loading && !content && agent) {
    loadContent()
  }

  // Reset when closing
  const handleOpenChange = (v: boolean) => {
    if (!v) setContent('')
    onOpenChange(v)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('agents.editAgent')}: {agent?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 flex-1 min-h-0 overflow-hidden">
          <Label>Contenuto file .md</Label>
          {loading ? (
            <p className="text-muted-foreground">{t('common.loading')}</p>
          ) : (
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="font-mono text-xs h-[50vh] resize-none"
            />
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? t('mcp.saving') : t('mcp.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function SubagentsPage() {
  const { t } = useI18n()
  const [formOpen, setFormOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState<SubAgentUI | null>(null)
  const [editingFile, setEditingFile] = useState<LocalAgent | null>(null)
  const [fileEditorOpen, setFileEditorOpen] = useState(false)
  const subAgents = useConfigStore((s) => s.subAgents)
  const localAgents = useConfigStore((s) => s.localAgents)
  const loadConfigs = useConfigStore((s) => s.loadConfigs)

  const handleAdd = () => {
    setEditingAgent(null)
    setFormOpen(true)
  }

  const handleEdit = (agent: SubAgentUI) => {
    setEditingAgent(agent)
    setFormOpen(true)
  }

  const handleEditFile = (agent: LocalAgent) => {
    setEditingFile(agent)
    setFileEditorOpen(true)
  }

  const handleDeleteFile = async (agent: LocalAgent) => {
    try {
      await invoke('delete_agent_file', { path: agent.path })
      toast.success(`Agent "${agent.name}" ${t('common.removed')}`)
      await loadConfigs()
    } catch (e) {
      toast.error(`${t('common.error')}: ${e}`)
    }
  }

  const customAgents = localAgents.filter((a) => a.plugin === 'custom')
  const pluginAgents = localAgents.filter((a) => a.plugin !== 'custom')

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{t('agents.title')}</h2>
        <Button onClick={handleAdd}>{t('agents.addAgent')}</Button>
      </div>

      {/* Custom user agents (editable) */}
      {customAgents.length > 0 && (
        <>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">{t('agents.userAgents')}</h3>
          <div className="space-y-2 mb-6">
            {customAgents.map((agent) => (
              <CustomAgentCard
                key={agent.path}
                agent={agent}
                onEdit={handleEditFile}
                onDelete={handleDeleteFile}
              />
            ))}
          </div>
        </>
      )}

      {/* Plugin agents (read-only) */}
      {pluginAgents.length > 0 && (
        <>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">{t('agents.pluginAgents')}</h3>
          <div className="space-y-2 mb-6">
            {pluginAgents.map((agent) => (
              <CustomAgentCard
                key={agent.path}
                agent={agent}
                onEdit={handleEditFile}
                onDelete={handleDeleteFile}
              />
            ))}
          </div>
        </>
      )}

      {/* Agents from settings.json */}
      {subAgents.length > 0 && (
        <>
          {(customAgents.length > 0 || pluginAgents.length > 0) && <Separator className="mb-6" />}
          <h3 className="text-sm font-medium text-muted-foreground mb-3">{t('agents.configAgents')}</h3>
          <div className="space-y-3">
            {subAgents.map((agent) => (
              <SubagentCard
                key={`${agent.scope}-${agent.id}`}
                agent={agent}
                onEdit={handleEdit}
              />
            ))}
          </div>
        </>
      )}

      {localAgents.length === 0 && subAgents.length === 0 && (
        <p className="text-muted-foreground py-8 text-center">
          {t('agents.noAgents')}
        </p>
      )}

      <SubagentForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editingAgent={editingAgent}
      />
      <AgentFileEditor
        open={fileEditorOpen}
        onOpenChange={setFileEditorOpen}
        agent={editingFile}
      />
    </div>
  )
}
