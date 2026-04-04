import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useConfigStore } from '@/store/configStore'
import { useI18n } from '@/i18n/useI18n'
import type { SubAgentUI, ConfigScope } from '@/types/claude'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface SubagentFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingAgent: SubAgentUI | null
}

export function SubagentForm({ open, onOpenChange, editingAgent }: SubagentFormProps) {
  const mode = useConfigStore((s) => s.mode)
  const addSubAgent = useConfigStore((s) => s.addSubAgent)
  const updateSubAgent = useConfigStore((s) => s.updateSubAgent)
  const { t } = useI18n()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [prompt, setPrompt] = useState('')
  const [scope, setScope] = useState<ConfigScope>('global')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editingAgent) {
      setName(editingAgent.id); setDescription(editingAgent.description ?? '')
      setPrompt(editingAgent.prompt); setScope(editingAgent.scope)
    } else {
      setName(''); setDescription(''); setPrompt('')
      setScope(mode === 'project' ? 'project' : 'global')
    }
  }, [editingAgent, open, mode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !prompt.trim()) return
    setSaving(true)
    try {
      const agent = { prompt: prompt.trim(), description: description.trim() || undefined, enabled: true }
      if (editingAgent) {
        await updateSubAgent(name.trim(), agent, scope)
        toast.success(`Sub-agent "${name}" ${t('common.updated')}`)
      } else {
        await addSubAgent(name.trim(), agent, scope)
        toast.success(`Sub-agent "${name}" ${t('common.added')}`)
      }
      onOpenChange(false)
    } catch (e) {
      toast.error(`${t('common.error')}: ${e}`)
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingAgent ? t('agents.editAgentTitle') : t('agents.addAgentTitle')}</DialogTitle>
          <DialogDescription />
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t('mcp.name')}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="es. code-reviewer" disabled={!!editingAgent} />
          </div>
          <div className="space-y-2">
            <Label>{t('agents.description')}</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t('agents.prompt')}</Label>
            <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={6} />
          </div>
          {mode === 'project' && (
            <div className="space-y-2">
              <Label>{t('mcp.scope')}</Label>
              <div className="flex gap-2">
                <Button type="button" variant={scope === 'global' ? 'default' : 'outline'} size="sm" onClick={() => setScope('global')}>{t('common.global')}</Button>
                <Button type="button" variant={scope === 'project' ? 'default' : 'outline'} size="sm" onClick={() => setScope('project')}>{t('common.project')}</Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="submit" disabled={saving || !name.trim() || !prompt.trim()}>
              {saving ? t('mcp.saving') : editingAgent ? t('mcp.save') : t('mcp.add')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
