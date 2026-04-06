import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { useI18n } from '@/i18n/useI18n'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  WebhookIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  SparklesIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from 'lucide-react'

type EventType = 'PreToolUse' | 'PostToolUse' | 'Notification' | 'Stop' | 'SubagentStop'

interface HookCommand {
  type: 'command'
  command: string
  timeout?: number
}

interface HookMatcher {
  matcher: string
  hooks: HookCommand[]
}

type HooksData = Record<string, HookMatcher[]>

const EVENT_TYPES: EventType[] = ['PreToolUse', 'PostToolUse', 'Notification', 'Stop', 'SubagentStop']

interface HookFormData {
  eventType: EventType
  matcher: string
  command: string
  timeout: number
}

const TEMPLATES: { label: string; labelIt: string; data: HookFormData }[] = [
  {
    label: 'Prettier on save',
    labelIt: 'Prettier al salvataggio',
    data: {
      eventType: 'PostToolUse',
      matcher: 'Write|Edit',
      command: 'npx prettier --write "$CLAUDE_FILE_PATH"',
      timeout: 10,
    },
  },
  {
    label: 'TypeCheck post-edit',
    labelIt: 'TypeCheck dopo modifica',
    data: {
      eventType: 'PostToolUse',
      matcher: 'Write|Edit',
      command: 'npx tsc --noEmit 2>&1 | head -20',
      timeout: 30,
    },
  },
  {
    label: 'Lint on save',
    labelIt: 'Lint al salvataggio',
    data: {
      eventType: 'PostToolUse',
      matcher: 'Write|Edit',
      command: 'npx eslint --fix "$CLAUDE_FILE_PATH"',
      timeout: 15,
    },
  },
]

export function HooksPage() {
  const { t, locale } = useI18n()
  const [hooks, setHooks] = useState<HooksData>({})
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingKey, setEditingKey] = useState<{ event: string; index: number; hookIndex: number } | null>(null)
  const [form, setForm] = useState<HookFormData>({
    eventType: 'PostToolUse',
    matcher: '',
    command: '',
    timeout: 10,
  })
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})

  const loadHooks = async () => {
    try {
      const data = await invoke<HooksData>('read_hooks')
      setHooks(data ?? {})
    } catch (e) {
      toast.error(`${t('common.error')}: ${e}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadHooks() }, [])

  const saveHooks = async (newHooks: HooksData) => {
    try {
      await invoke('write_hooks', { hooks: newHooks })
      setHooks(newHooks)
      toast.success(locale === 'it' ? 'Hooks salvati' : 'Hooks saved')
    } catch (e) {
      toast.error(`${t('common.error')}: ${e}`)
    }
  }

  const handleAdd = () => {
    setEditingKey(null)
    setForm({ eventType: 'PostToolUse', matcher: '', command: '', timeout: 10 })
    setFormOpen(true)
  }

  const handleEdit = (event: string, matcherIdx: number, hookIdx: number, matcher: HookMatcher) => {
    setEditingKey({ event, index: matcherIdx, hookIndex: hookIdx })
    setForm({
      eventType: event as EventType,
      matcher: matcher.matcher,
      command: matcher.hooks[hookIdx]?.command ?? '',
      timeout: matcher.hooks[hookIdx]?.timeout ?? 10,
    })
    setFormOpen(true)
  }

  const handleDelete = async (event: string, matcherIdx: number, hookIdx: number) => {
    const newHooks = { ...hooks }
    const matchers = [...(newHooks[event] ?? [])]
    const matcher = { ...matchers[matcherIdx] }
    const hooksArr = [...matcher.hooks]
    hooksArr.splice(hookIdx, 1)

    if (hooksArr.length === 0) {
      matchers.splice(matcherIdx, 1)
    } else {
      matcher.hooks = hooksArr
      matchers[matcherIdx] = matcher
    }

    if (matchers.length === 0) {
      delete newHooks[event]
    } else {
      newHooks[event] = matchers
    }

    await saveHooks(newHooks)
  }

  const handleSave = async () => {
    if (!form.matcher || !form.command) return

    const newHooks = { ...hooks }
    const hookCmd: HookCommand = { type: 'command', command: form.command, timeout: form.timeout }

    if (editingKey) {
      // Editing existing
      const matchers = [...(newHooks[editingKey.event] ?? [])]
      const matcher = { ...matchers[editingKey.index] }
      const hooksArr = [...matcher.hooks]
      hooksArr[editingKey.hookIndex] = hookCmd
      matcher.hooks = hooksArr
      matcher.matcher = form.matcher
      matchers[editingKey.index] = matcher

      // If event type changed, move the entry
      if (editingKey.event !== form.eventType) {
        hooksArr.splice(editingKey.hookIndex, 1)
        if (hooksArr.length === 0) {
          matchers.splice(editingKey.index, 1)
        } else {
          matcher.hooks = hooksArr
          matchers[editingKey.index] = matcher
        }
        if (matchers.length === 0) {
          delete newHooks[editingKey.event]
        } else {
          newHooks[editingKey.event] = matchers
        }

        // Add to new event type
        if (!newHooks[form.eventType]) newHooks[form.eventType] = []
        const existing = newHooks[form.eventType].find(m => m.matcher === form.matcher)
        if (existing) {
          existing.hooks.push(hookCmd)
        } else {
          newHooks[form.eventType].push({ matcher: form.matcher, hooks: [hookCmd] })
        }
      } else {
        newHooks[editingKey.event] = matchers
      }
    } else {
      // Adding new
      if (!newHooks[form.eventType]) newHooks[form.eventType] = []
      const existing = newHooks[form.eventType].find(m => m.matcher === form.matcher)
      if (existing) {
        existing.hooks.push(hookCmd)
      } else {
        newHooks[form.eventType].push({ matcher: form.matcher, hooks: [hookCmd] })
      }
    }

    await saveHooks(newHooks)
    setFormOpen(false)
  }

  const handleTemplate = (data: HookFormData) => {
    setEditingKey(null)
    setForm(data)
    setFormOpen(true)
  }

  const toggleSection = (event: string) => {
    setCollapsedSections(prev => ({ ...prev, [event]: !prev[event] }))
  }

  // Count total hooks
  let totalHooks = 0
  for (const matchers of Object.values(hooks)) {
    for (const m of matchers) {
      totalHooks += m.hooks.length
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{locale === 'it' ? 'Hooks' : 'Hooks'}</h2>
        <Button onClick={handleAdd}>
          <PlusIcon className="size-4 mr-1.5" />
          {locale === 'it' ? 'Aggiungi Hook' : 'Add Hook'}
        </Button>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
            <WebhookIcon className="size-3.5 text-primary" />
          </div>
          <span className="font-medium">{totalHooks}</span>
          <span className="text-muted-foreground">{locale === 'it' ? 'hook totali' : 'total hooks'}</span>
        </div>
        {Object.keys(hooks).length > 0 && (
          <>
            <Separator orientation="vertical" className="h-5" />
            <div className="flex items-center gap-1.5 text-sm">
              <span className="font-medium">{Object.keys(hooks).length}</span>
              <span className="text-muted-foreground">{locale === 'it' ? 'tipi evento' : 'event types'}</span>
            </div>
          </>
        )}
      </div>

      {/* Templates */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">
          {locale === 'it' ? 'Template:' : 'Templates:'}
        </span>
        {TEMPLATES.map((tmpl) => (
          <Button
            key={tmpl.label}
            variant="outline"
            size="sm"
            onClick={() => handleTemplate(tmpl.data)}
          >
            <SparklesIcon className="size-3 mr-1.5" />
            {locale === 'it' ? tmpl.labelIt : tmpl.label}
          </Button>
        ))}
      </div>

      {/* Hooks grouped by event */}
      {Object.entries(hooks).map(([event, matchers]) => (
        <div key={event} className="rounded-xl border border-border bg-card">
          <button
            className="w-full flex items-center gap-3 p-4 text-left cursor-pointer hover:bg-accent/30 transition-colors"
            onClick={() => toggleSection(event)}
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <WebhookIcon className="size-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold">{event}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {matchers.reduce((sum, m) => sum + m.hooks.length, 0)} hook{matchers.reduce((sum, m) => sum + m.hooks.length, 0) !== 1 ? 's' : ''}
              </p>
            </div>
            {collapsedSections[event]
              ? <ChevronDownIcon className="size-4 text-muted-foreground" />
              : <ChevronUpIcon className="size-4 text-muted-foreground" />
            }
          </button>
          {!collapsedSections[event] && (
            <>
              <Separator />
              <div className="p-4 space-y-2">
                {matchers.map((matcher, mIdx) =>
                  matcher.hooks.map((hook, hIdx) => (
                    <div
                      key={`${mIdx}-${hIdx}`}
                      className="flex items-start justify-between rounded-lg bg-muted/30 p-3"
                    >
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{matcher.matcher}</Badge>
                          {hook.timeout && (
                            <Badge variant="secondary" className="text-xs">{hook.timeout}s timeout</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono truncate mt-1">{hook.command}</p>
                      </div>
                      <div className="flex gap-1 ml-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleEdit(event, mIdx, hIdx, matcher)}
                        >
                          <PencilIcon className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleDelete(event, mIdx, hIdx)}
                        >
                          <TrashIcon className="size-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      ))}

      {/* Empty state */}
      {totalHooks === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <WebhookIcon className="size-7 text-muted-foreground/60" />
          </div>
          <p className="text-sm font-medium mb-1">
            {locale === 'it' ? 'Nessun hook configurato' : 'No hooks configured'}
          </p>
          <p className="text-xs text-muted-foreground max-w-xs">
            {locale === 'it'
              ? 'Aggiungi hooks per eseguire comandi automatici durante le sessioni di Claude Code.'
              : 'Add hooks to run automatic commands during Claude Code sessions.'}
          </p>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingKey
                ? (locale === 'it' ? 'Modifica Hook' : 'Edit Hook')
                : (locale === 'it' ? 'Aggiungi Hook' : 'Add Hook')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">
                {locale === 'it' ? 'Tipo Evento' : 'Event Type'}
              </Label>
              <div className="flex gap-2 flex-wrap mt-1">
                {EVENT_TYPES.map((et) => (
                  <Button
                    key={et}
                    variant={form.eventType === et ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setForm({ ...form, eventType: et })}
                  >
                    {et}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs">Matcher</Label>
              <Input
                value={form.matcher}
                onChange={(e) => setForm({ ...form, matcher: e.target.value })}
                placeholder="Write|Edit"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {locale === 'it'
                  ? 'Regex per matchare tool o eventi. Es: Write|Edit, Bash, *'
                  : 'Regex to match tools or events. E.g.: Write|Edit, Bash, *'}
              </p>
            </div>
            <div>
              <Label className="text-xs">
                {locale === 'it' ? 'Comando' : 'Command'}
              </Label>
              <Input
                value={form.command}
                onChange={(e) => setForm({ ...form, command: e.target.value })}
                placeholder='npx prettier --write "$CLAUDE_FILE_PATH"'
                className="mt-1 font-mono text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Timeout ({locale === 'it' ? 'secondi' : 'seconds'})</Label>
              <Input
                type="number"
                value={form.timeout}
                onChange={(e) => setForm({ ...form, timeout: parseInt(e.target.value) || 10 })}
                className="mt-1 w-24"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>
              {locale === 'it' ? 'Annulla' : 'Cancel'}
            </Button>
            <Button onClick={handleSave} disabled={!form.matcher || !form.command}>
              {locale === 'it' ? 'Salva' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
