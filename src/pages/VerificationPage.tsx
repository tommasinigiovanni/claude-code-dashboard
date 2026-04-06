import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useConfigStore } from '@/store/configStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { useI18n } from '@/i18n/useI18n'
import {
  PlayCircleIcon,
  CheckCircle2Icon,
  XCircleIcon,
  ClockIcon,
  TrashIcon,
  BarChart3Icon,
} from 'lucide-react'

interface VerificationResult {
  output: string
  success: boolean
  duration_ms: number
}

interface HistoryEntry {
  id: string
  prompt: string
  output: string
  success: boolean
  duration_ms: number
  timestamp: string
}

const STORAGE_KEY = 'ccd-verification-history'

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveHistory(entries: HistoryEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 50)))
}

export function VerificationPage() {
  const { t, locale } = useI18n()
  const projectPath = useConfigStore((s) => s.projectPath)
  const [prompt, setPrompt] = useState('run tests and verify everything passes')
  const [running, setRunning] = useState(false)
  const [currentOutput, setCurrentOutput] = useState<string | null>(null)
  const [currentSuccess, setCurrentSuccess] = useState<boolean | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory)
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null)

  const runVerification = async () => {
    if (!prompt.trim()) return
    setRunning(true)
    setCurrentOutput(null)
    setCurrentSuccess(null)
    setSelectedEntry(null)

    try {
      const result = await invoke<VerificationResult>('run_verification', {
        prompt: prompt.trim(),
        projectPath,
      })
      setCurrentOutput(result.output)
      setCurrentSuccess(result.success)

      const entry: HistoryEntry = {
        id: Date.now().toString(),
        prompt: prompt.trim(),
        output: result.output,
        success: result.success,
        duration_ms: result.duration_ms,
        timestamp: new Date().toISOString(),
      }
      const updated = [entry, ...history]
      setHistory(updated)
      saveHistory(updated)
    } catch (e) {
      toast.error(`${t('common.error')}: ${e}`)
      setCurrentOutput(String(e))
      setCurrentSuccess(false)
    } finally {
      setRunning(false)
    }
  }

  const clearHistory = () => {
    setHistory([])
    saveHistory([])
    setSelectedEntry(null)
  }

  const totalRuns = history.length
  const passCount = history.filter((h) => h.success).length
  const passRate = totalRuns > 0 ? Math.round((passCount / totalRuns) * 100) : 0

  const displayOutput = selectedEntry ? selectedEntry.output : currentOutput

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          {locale === 'it' ? 'Verifica' : 'Verification'}
        </h2>
        <Button onClick={runVerification} disabled={running || !prompt.trim()}>
          <PlayCircleIcon className={`size-4 mr-1.5 ${running ? 'animate-spin' : ''}`} />
          {running
            ? locale === 'it' ? 'In esecuzione...' : 'Running...'
            : locale === 'it' ? 'Esegui' : 'Run'}
        </Button>
      </div>

      {/* Command input */}
      <div className="space-y-2">
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={locale === 'it' ? 'Comando di verifica...' : 'Verification command...'}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !running) runVerification()
          }}
        />
        {projectPath && (
          <p className="text-xs text-muted-foreground">
            {locale === 'it' ? 'Progetto' : 'Project'}: {projectPath}
          </p>
        )}
      </div>

      {/* Stats bar */}
      {totalRuns > 0 && (
        <div className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
              <BarChart3Icon className="size-3.5 text-primary" />
            </div>
            <span className="font-medium">{totalRuns}</span>
            <span className="text-muted-foreground">
              {locale === 'it' ? 'esecuzioni' : 'runs'}
            </span>
          </div>
          <Separator orientation="vertical" className="h-5" />
          <div className="flex items-center gap-1.5 text-sm">
            <CheckCircle2Icon className="size-3.5 text-green-500" />
            <span className="font-medium">{passCount}</span>
            <span className="text-muted-foreground">
              {locale === 'it' ? 'passati' : 'passed'}
            </span>
          </div>
          <Separator orientation="vertical" className="h-5" />
          <div className="flex items-center gap-1.5 text-sm">
            <span className="font-medium">{passRate}%</span>
            <span className="text-muted-foreground">
              {locale === 'it' ? 'tasso successo' : 'pass rate'}
            </span>
          </div>
          <div className="ml-auto">
            <Button variant="ghost" size="sm" onClick={clearHistory}>
              <TrashIcon className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Output display */}
      {displayOutput !== null && (
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3 p-4">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              (selectedEntry ? selectedEntry.success : currentSuccess)
                ? 'bg-green-500/10'
                : 'bg-red-500/10'
            }`}>
              {(selectedEntry ? selectedEntry.success : currentSuccess)
                ? <CheckCircle2Icon className="size-4 text-green-500" />
                : <XCircleIcon className="size-4 text-red-500" />
              }
            </div>
            <div>
              <h3 className="text-sm font-semibold">
                {(selectedEntry ? selectedEntry.success : currentSuccess)
                  ? locale === 'it' ? 'Passato' : 'Passed'
                  : locale === 'it' ? 'Fallito' : 'Failed'}
              </h3>
              {selectedEntry && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(selectedEntry.timestamp).toLocaleString(locale)} - {selectedEntry.duration_ms}ms
                </p>
              )}
            </div>
          </div>
          <Separator />
          <div className="p-4 max-h-[400px] overflow-auto">
            <pre className="text-xs font-mono whitespace-pre-wrap break-words text-foreground/90">
              {displayOutput || (locale === 'it' ? 'Nessun output' : 'No output')}
            </pre>
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3 p-4">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <ClockIcon className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">
                {locale === 'it' ? 'Cronologia' : 'History'}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {history.length} {locale === 'it' ? 'esecuzioni' : 'runs'}
              </p>
            </div>
          </div>
          <Separator />
          <div className="p-4 space-y-2 max-h-[300px] overflow-auto">
            {history.map((entry) => (
              <button
                key={entry.id}
                onClick={() => setSelectedEntry(entry)}
                className={`w-full text-left flex items-center justify-between rounded-lg p-3 transition-colors ${
                  selectedEntry?.id === entry.id
                    ? 'bg-accent'
                    : 'bg-muted/30 hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {entry.success
                    ? <CheckCircle2Icon className="size-4 text-green-500 shrink-0" />
                    : <XCircleIcon className="size-4 text-red-500 shrink-0" />
                  }
                  <div className="min-w-0">
                    <span className="text-sm font-medium truncate block">{entry.prompt}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.timestamp).toLocaleString(locale)}
                    </span>
                  </div>
                </div>
                <Badge variant={entry.success ? 'default' : 'destructive'} className="ml-2 shrink-0">
                  {entry.duration_ms}ms
                </Badge>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {history.length === 0 && currentOutput === null && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <PlayCircleIcon className="size-7 text-muted-foreground/60" />
          </div>
          <p className="text-sm font-medium mb-1">
            {locale === 'it' ? 'Nessuna verifica eseguita' : 'No verifications run yet'}
          </p>
          <p className="text-xs text-muted-foreground max-w-xs">
            {locale === 'it'
              ? 'Esegui un comando di verifica per controllare lo stato del progetto.'
              : 'Run a verification command to check the project status.'}
          </p>
        </div>
      )}
    </div>
  )
}
