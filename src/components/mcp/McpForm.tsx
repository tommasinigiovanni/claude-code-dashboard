import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useConfigStore } from '@/store/configStore'
import type { McpServerUI, ConfigScope } from '@/types/claude'
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

interface McpFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingMcp: McpServerUI | null
}

export function McpForm({ open, onOpenChange, editingMcp }: McpFormProps) {
  const mode = useConfigStore((s) => s.mode)
  const addMcp = useConfigStore((s) => s.addMcp)
  const updateMcp = useConfigStore((s) => s.updateMcp)

  const [name, setName] = useState('')
  const [command, setCommand] = useState('')
  const [args, setArgs] = useState('')
  const [env, setEnv] = useState('')
  const [scope, setScope] = useState<ConfigScope>('global')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editingMcp) {
      setName(editingMcp.id)
      setCommand(editingMcp.command)
      setArgs(editingMcp.args?.join(' ') ?? '')
      setEnv(
        editingMcp.env
          ? Object.entries(editingMcp.env)
              .map(([k, v]) => `${k}=${v}`)
              .join('\n')
          : ''
      )
      setScope(editingMcp.scope)
    } else {
      setName('')
      setCommand('')
      setArgs('')
      setEnv('')
      setScope(mode === 'project' ? 'project' : 'global')
    }
  }, [editingMcp, open, mode])

  const parseEnv = (envStr: string): Record<string, string> | undefined => {
    if (!envStr.trim()) return undefined
    const result: Record<string, string> = {}
    for (const line of envStr.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      result[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1)
    }
    return Object.keys(result).length > 0 ? result : undefined
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !command.trim()) return

    setSaving(true)
    try {
      const server = {
        command: command.trim(),
        args: args.trim() ? args.trim().split(/\s+/) : undefined,
        env: parseEnv(env),
      }

      if (editingMcp) {
        await updateMcp(name.trim(), server, scope)
        toast.success(`MCP "${name}" aggiornato`)
      } else {
        await addMcp(name.trim(), server, scope)
        toast.success(`MCP "${name}" aggiunto`)
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editingMcp ? 'Modifica MCP' : 'Aggiungi MCP'}</DialogTitle>
          <DialogDescription>
            {editingMcp
              ? 'Modifica la configurazione del MCP server.'
              : 'Configura un nuovo MCP server.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mcp-name">Nome</Label>
            <Input
              id="mcp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="es. filesystem"
              disabled={!!editingMcp}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mcp-command">Comando</Label>
            <Input
              id="mcp-command"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="es. npx"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mcp-args">Argomenti (separati da spazi)</Label>
            <Input
              id="mcp-args"
              value={args}
              onChange={(e) => setArgs(e.target.value)}
              placeholder="es. -y @anthropic-ai/mcp-filesystem /Users/me"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mcp-env">Variabili ambiente (KEY=VALUE, una per riga)</Label>
            <Textarea
              id="mcp-env"
              value={env}
              onChange={(e) => setEnv(e.target.value)}
              placeholder={'BRAVE_API_KEY=BSA...\nOTHER_VAR=value'}
              rows={3}
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
            <Button type="submit" disabled={saving || !name.trim() || !command.trim()}>
              {saving ? 'Salvataggio…' : editingMcp ? 'Salva' : 'Aggiungi'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
