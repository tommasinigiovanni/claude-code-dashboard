import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useConfigStore } from '@/store/configStore'
import type { SubAgentUI, ConfigScope } from '@/types/claude'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [prompt, setPrompt] = useState('')
  const [scope, setScope] = useState<ConfigScope>('global')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editingAgent) {
      setName(editingAgent.id)
      setDescription(editingAgent.description ?? '')
      setPrompt(editingAgent.prompt)
      setScope(editingAgent.scope)
    } else {
      setName('')
      setDescription('')
      setPrompt('')
      setScope(mode === 'project' ? 'project' : 'global')
    }
  }, [editingAgent, open, mode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !prompt.trim()) return

    setSaving(true)
    try {
      const agent = {
        prompt: prompt.trim(),
        description: description.trim() || undefined,
        enabled: true,
      }

      if (editingAgent) {
        await updateSubAgent(name.trim(), agent, scope)
        toast.success(`Sub-agent "${name}" aggiornato`)
      } else {
        await addSubAgent(name.trim(), agent, scope)
        toast.success(`Sub-agent "${name}" aggiunto`)
      }
      onOpenChange(false)
    } catch (e) {
      toast.error(`Errore: ${e}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingAgent ? 'Modifica Sub-agent' : 'Aggiungi Sub-agent'}</DialogTitle>
          <DialogDescription>
            {editingAgent
              ? 'Modifica il sub-agent.'
              : 'Configura un nuovo sub-agent.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="agent-name">Nome</Label>
            <Input
              id="agent-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="es. code-reviewer"
              disabled={!!editingAgent}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="agent-description">Descrizione</Label>
            <Input
              id="agent-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="es. Revisiona codice e suggerisce miglioramenti"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="agent-prompt">Prompt</Label>
            <Textarea
              id="agent-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Sei un esperto revisore di codice..."
              rows={6}
            />
          </div>
          {mode === 'project' && (
            <div className="space-y-2">
              <Label>Scope</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={scope === 'global' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setScope('global')}
                >
                  Global
                </Button>
                <Button
                  type="button"
                  variant={scope === 'project' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setScope('project')}
                >
                  Project
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="submit" disabled={saving || !name.trim() || !prompt.trim()}>
              {saving ? 'Salvataggio…' : editingAgent ? 'Salva' : 'Aggiungi'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
