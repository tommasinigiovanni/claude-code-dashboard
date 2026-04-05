import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { toast } from 'sonner'
import { useConfigStore } from '@/store/configStore'
import type { SubAgentUI, LocalAgent } from '@/types/claude'
import { SubagentCard } from '@/components/subagents/SubagentCard'
import { SubagentForm } from '@/components/subagents/SubagentForm'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
import {
  UsersIcon, UserIcon, PlugIcon, SettingsIcon, SearchIcon,
  ChevronDownIcon, ChevronUpIcon, MoreHorizontalIcon, BotIcon,
} from 'lucide-react'

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
    <div className="flex items-start justify-between rounded-lg bg-muted/30 p-3">
      <div className="space-y-0.5 flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{agent.name}</span>
          <Badge variant="outline" className="text-xs">
            {agent.plugin}
          </Badge>
        </div>
        {agent.description && (
          <p className="text-xs text-muted-foreground truncate">{agent.description}</p>
        )}
        <p className="text-xs text-muted-foreground font-mono truncate">{agent.path}</p>
      </div>
      {agent.plugin === 'custom' && (
        <DropdownMenu>
          <DropdownMenuTrigger className="px-2 py-1 rounded-md hover:bg-accent text-muted-foreground">
            <MoreHorizontalIcon className="size-4" />
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
  const [search, setSearch] = useState('')
  const [userOpen, setUserOpen] = useState(true)
  const [pluginOpen, setPluginOpen] = useState(true)
  const [configOpen, setConfigOpen] = useState(true)
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
  const query = search.toLowerCase()

  const filteredCustom = customAgents.filter((a) =>
    a.name.toLowerCase().includes(query) || a.description?.toLowerCase().includes(query)
  )
  const filteredPlugin = pluginAgents.filter((a) =>
    a.name.toLowerCase().includes(query) || a.description?.toLowerCase().includes(query)
  )
  const filteredConfig = subAgents.filter((a) =>
    a.id.toLowerCase().includes(query)
  )

  const hasAny = localAgents.length > 0 || subAgents.length > 0
  const hasResults = filteredCustom.length > 0 || filteredPlugin.length > 0 || filteredConfig.length > 0

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t('agents.title')}</h2>
        <Button onClick={handleAdd}>{t('agents.addAgent')}</Button>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
            <UsersIcon className="size-3.5 text-primary" />
          </div>
          <span className="font-medium">{customAgents.length + pluginAgents.length + subAgents.length}</span>
          <span className="text-muted-foreground">total</span>
        </div>
        <Separator orientation="vertical" className="h-5" />
        <div className="flex items-center gap-1.5 text-sm">
          <UserIcon className="size-3.5 text-muted-foreground" />
          <span className="font-medium">{customAgents.length}</span>
          <span className="text-muted-foreground">{t('agents.statsUser')}</span>
        </div>
        <Separator orientation="vertical" className="h-5" />
        <div className="flex items-center gap-1.5 text-sm">
          <PlugIcon className="size-3.5 text-muted-foreground" />
          <span className="font-medium">{pluginAgents.length}</span>
          <span className="text-muted-foreground">{t('agents.statsPlugin')}</span>
        </div>
        <Separator orientation="vertical" className="h-5" />
        <div className="flex items-center gap-1.5 text-sm">
          <SettingsIcon className="size-3.5 text-muted-foreground" />
          <span className="font-medium">{subAgents.length}</span>
          <span className="text-muted-foreground">{t('agents.statsConfig')}</span>
        </div>
      </div>

      {/* Search */}
      {hasAny && (
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('agents.searchPlaceholder')}
            className="pl-9"
          />
        </div>
      )}

      {/* Custom user agents - collapsible */}
      {filteredCustom.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <button
            className="w-full flex items-center gap-3 p-4 text-left cursor-pointer hover:bg-accent/30 transition-colors"
            onClick={() => setUserOpen(!userOpen)}
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <UserIcon className="size-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold">{t('agents.userAgents')}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{filteredCustom.length} agent{filteredCustom.length !== 1 ? 's' : ''}</p>
            </div>
            {userOpen ? <ChevronUpIcon className="size-4 text-muted-foreground" /> : <ChevronDownIcon className="size-4 text-muted-foreground" />}
          </button>
          {userOpen && (
            <>
              <Separator />
              <div className="p-4 space-y-2">
                {filteredCustom.map((agent) => (
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
        </div>
      )}

      {/* Plugin agents - collapsible */}
      {filteredPlugin.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <button
            className="w-full flex items-center gap-3 p-4 text-left cursor-pointer hover:bg-accent/30 transition-colors"
            onClick={() => setPluginOpen(!pluginOpen)}
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <PlugIcon className="size-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold">{t('agents.pluginAgents')}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{filteredPlugin.length} agent{filteredPlugin.length !== 1 ? 's' : ''}</p>
            </div>
            {pluginOpen ? <ChevronUpIcon className="size-4 text-muted-foreground" /> : <ChevronDownIcon className="size-4 text-muted-foreground" />}
          </button>
          {pluginOpen && (
            <>
              <Separator />
              <div className="p-4 space-y-2">
                {filteredPlugin.map((agent) => (
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
        </div>
      )}

      {/* Config agents - collapsible */}
      {filteredConfig.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <button
            className="w-full flex items-center gap-3 p-4 text-left cursor-pointer hover:bg-accent/30 transition-colors"
            onClick={() => setConfigOpen(!configOpen)}
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <SettingsIcon className="size-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold">{t('agents.configAgents')}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{filteredConfig.length} agent{filteredConfig.length !== 1 ? 's' : ''}</p>
            </div>
            {configOpen ? <ChevronUpIcon className="size-4 text-muted-foreground" /> : <ChevronDownIcon className="size-4 text-muted-foreground" />}
          </button>
          {configOpen && (
            <>
              <Separator />
              <div className="p-4 space-y-3">
                {filteredConfig.map((agent) => (
                  <SubagentCard
                    key={`${agent.scope}-${agent.id}`}
                    agent={agent}
                    onEdit={handleEdit}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* No search results */}
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
            <BotIcon className="size-7 text-muted-foreground/60" />
          </div>
          <p className="text-sm font-medium mb-1">{t('agents.noAgents')}</p>
          <p className="text-xs text-muted-foreground max-w-xs">{t('agents.emptyDesc')}</p>
        </div>
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
