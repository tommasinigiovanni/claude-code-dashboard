import { useState, useEffect } from 'react'
import { readMemories } from '@/services/api'
import { useConfigStore } from '@/store/configStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { useI18n } from '@/i18n/useI18n'
import {
  BrainIcon,
  RefreshCwIcon,
  SearchIcon,
  FileTextIcon,
  FolderIcon,
  TagIcon,
} from 'lucide-react'

interface MemoryFile {
  name: string
  description: string
  memory_type: string
  content: string
  project: string
  path: string
}

const MEMORY_TYPES = ['all', 'user', 'feedback', 'project', 'reference'] as const

function typeColor(t: string): string {
  switch (t) {
    case 'user': return 'bg-blue-500/10 text-blue-600'
    case 'feedback': return 'bg-amber-500/10 text-amber-600'
    case 'project': return 'bg-green-500/10 text-green-600'
    case 'reference': return 'bg-purple-500/10 text-purple-600'
    default: return 'bg-muted text-muted-foreground'
  }
}

export function LearningPage() {
  const { t, locale } = useI18n()
  const projectPath = useConfigStore((s) => s.projectPath)
  const [memories, setMemories] = useState<MemoryFile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [expandedPath, setExpandedPath] = useState<string | null>(null)

  const loadMemories = async () => {
    setLoading(true)
    try {
      const data = await readMemories(null)
      setMemories(data)
    } catch (e) {
      toast.error(`${t('common.error')}: ${e}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMemories()
  }, [])

  // Separate current project vs others
  const currentProjectMemories = projectPath
    ? memories.filter((m) => {
        const lastComponent = projectPath.split('/').pop() ?? ''
        return m.project.includes(lastComponent)
      })
    : []
  const otherMemories = projectPath
    ? memories.filter((m) => {
        const lastComponent = projectPath.split('/').pop() ?? ''
        return !m.project.includes(lastComponent)
      })
    : memories

  // Apply filters
  const filterMemories = (list: MemoryFile[]) => {
    let filtered = list
    if (typeFilter !== 'all') {
      filtered = filtered.filter((m) => m.memory_type === typeFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      filtered = filtered.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.content.toLowerCase().includes(q) ||
          m.project.toLowerCase().includes(q)
      )
    }
    return filtered
  }

  const filteredCurrent = filterMemories(currentProjectMemories)
  const filteredOther = filterMemories(otherMemories)

  // Stats
  const totalMemories = memories.length
  const byType = new Map<string, number>()
  for (const m of memories) {
    byType.set(m.memory_type, (byType.get(m.memory_type) ?? 0) + 1)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    )
  }

  const renderMemoryCard = (m: MemoryFile) => {
    const isExpanded = expandedPath === m.path
    return (
      <button
        key={m.path}
        onClick={() => setExpandedPath(isExpanded ? null : m.path)}
        className="w-full text-left rounded-xl border border-border bg-card p-4 hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FileTextIcon className="size-5 text-primary" />
            </div>
            <div className="min-w-0">
              <span className="text-sm font-medium block truncate">{m.name}</span>
              {m.description && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{m.description}</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${typeColor(m.memory_type)}`}>
                  {m.memory_type}
                </Badge>
                <span className="text-[10px] text-muted-foreground truncate">{m.project}</span>
              </div>
            </div>
          </div>
        </div>
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-border">
            <pre className="text-xs font-mono whitespace-pre-wrap break-words text-foreground/80 max-h-[200px] overflow-auto">
              {m.content}
            </pre>
            <p className="text-[10px] text-muted-foreground mt-2 truncate">{m.path}</p>
          </div>
        )}
      </button>
    )
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          {locale === 'it' ? 'Memorie' : 'Memories'}
        </h2>
        <Button variant="outline" size="sm" onClick={loadMemories} disabled={loading}>
          <RefreshCwIcon className={`size-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          {locale === 'it' ? 'Aggiorna' : 'Refresh'}
        </Button>
      </div>

      {/* Stats bar */}
      {totalMemories > 0 && (
        <div className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-2.5 flex-wrap">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
              <BrainIcon className="size-3.5 text-primary" />
            </div>
            <span className="font-medium">{totalMemories}</span>
            <span className="text-muted-foreground">
              {locale === 'it' ? 'memorie' : 'memories'}
            </span>
          </div>
          {Array.from(byType.entries()).map(([type, count]) => (
            <span key={type} className="flex items-center gap-1 text-xs">
              <Separator orientation="vertical" className="h-5" />
              <TagIcon className="size-3 text-muted-foreground" />
              <span className="font-medium">{count}</span>
              <span className="text-muted-foreground">{type}</span>
            </span>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={locale === 'it' ? 'Cerca memorie...' : 'Search memories...'}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {MEMORY_TYPES.map((type) => (
            <Button
              key={type}
              variant={typeFilter === type ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTypeFilter(type)}
              className="text-xs"
            >
              {type === 'all' ? (locale === 'it' ? 'Tutti' : 'All') : type}
            </Button>
          ))}
        </div>
      </div>

      {/* Current Project section */}
      {projectPath && filteredCurrent.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FolderIcon className="size-4 text-primary" />
            <h3 className="text-sm font-semibold">
              {locale === 'it' ? 'Progetto corrente' : 'Current Project'}
            </h3>
            <Badge variant="secondary" className="text-[10px]">{filteredCurrent.length}</Badge>
          </div>
          <div className="space-y-2">
            {filteredCurrent.map(renderMemoryCard)}
          </div>
        </div>
      )}

      {/* All Projects section */}
      {filteredOther.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FolderIcon className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">
              {locale === 'it' ? 'Tutti i progetti' : 'All Projects'}
            </h3>
            <Badge variant="secondary" className="text-[10px]">{filteredOther.length}</Badge>
          </div>
          <div className="space-y-2">
            {filteredOther.map(renderMemoryCard)}
          </div>
        </div>
      )}

      {/* Empty state */}
      {memories.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <BrainIcon className="size-7 text-muted-foreground/60" />
          </div>
          <p className="text-sm font-medium mb-1">
            {locale === 'it' ? 'Nessuna memoria trovata' : 'No memories found'}
          </p>
          <p className="text-xs text-muted-foreground max-w-xs">
            {locale === 'it'
              ? 'Le memorie appariranno dopo che Claude Code avra\' appreso dal tuo progetto.'
              : 'Memories will appear after Claude Code learns from your project.'}
          </p>
        </div>
      )}

      {/* No results for filter */}
      {memories.length > 0 && filteredCurrent.length === 0 && filteredOther.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <SearchIcon className="size-7 text-muted-foreground/60" />
          </div>
          <p className="text-sm font-medium mb-1">
            {locale === 'it' ? 'Nessun risultato' : 'No results'}
          </p>
          <p className="text-xs text-muted-foreground max-w-xs">
            {locale === 'it'
              ? 'Prova a cambiare i filtri di ricerca.'
              : 'Try changing the search filters.'}
          </p>
        </div>
      )}
    </div>
  )
}
