import { useState, useEffect } from 'react'
import { writeAgentFile, readAgentFile, getClaudeHome } from '@/services/api'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useI18n } from '@/i18n/useI18n'
import { useConfigStore } from '@/store/configStore'
import {
  FileEditIcon,
  SaveIcon,
  SparklesIcon,
  GlobeIcon,
  FolderIcon,
  EyeIcon,
  PencilIcon,
} from 'lucide-react'

const TEMPLATES = {
  typescript: {
    label: 'TypeScript project',
    labelIt: 'Progetto TypeScript',
    content: `# Project Guidelines

## Language & Framework
- TypeScript with strict mode enabled
- Use ES modules (import/export)
- Prefer functional components and hooks in React

## Code Style
- Use camelCase for variables and functions
- Use PascalCase for types, interfaces, and components
- Prefer const over let, never use var
- Use template literals for string interpolation

## Testing
- Write tests with Vitest or Jest
- Aim for meaningful test coverage
- Test behavior, not implementation details

## Error Handling
- Use typed error handling where possible
- Always handle async errors with try/catch
- Provide meaningful error messages
`,
  },
  python: {
    label: 'Python project',
    labelIt: 'Progetto Python',
    content: `# Project Guidelines

## Language & Style
- Python 3.10+ with type hints
- Follow PEP 8 conventions
- Use f-strings for string formatting

## Project Structure
- Use pyproject.toml for project configuration
- Organize code into packages and modules
- Keep functions focused and small

## Testing
- Write tests with pytest
- Use fixtures for test setup
- Aim for meaningful test coverage

## Error Handling
- Use specific exception types
- Document exceptions in docstrings
- Use context managers for resource management
`,
  },
  general: {
    label: 'General',
    labelIt: 'Generale',
    content: `# Project Guidelines

## General Rules
- Keep code clean and well-documented
- Follow existing patterns in the codebase
- Write meaningful commit messages
- Review your changes before committing

## Documentation
- Add comments for complex logic
- Keep README up to date
- Document public APIs

## Best Practices
- Don't repeat yourself (DRY)
- Keep functions small and focused
- Handle errors gracefully
- Write tests for new features
`,
  },
}

type Tab = 'global' | 'project'

export function ClaudeMdPage() {
  const { t, locale } = useI18n()
  const [tab, setTab] = useState<Tab>('global')
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [claudeHome, setClaudeHome] = useState<string | null>(null)
  const projectPath = useConfigStore((s) => s.projectPath)

  // Resolve ~/.claude path once
  useEffect(() => {
    getClaudeHome()
      .then(setClaudeHome)
      .catch(() => {})
  }, [])

  const getFilePath = (targetTab: Tab): string | null => {
    if (targetTab === 'global' && claudeHome) {
      return `${claudeHome}/CLAUDE.md`
    }
    if (targetTab === 'project' && projectPath) {
      return `${projectPath}/CLAUDE.md`
    }
    return null
  }

  const loadContent = async (targetTab: Tab) => {
    const filePath = getFilePath(targetTab)
    if (!filePath) {
      setContent('')
      return
    }

    setLoading(true)
    try {
      const text = await readAgentFile(filePath)
      setContent(text)
      setHasChanges(false)
    } catch {
      // File doesn't exist yet
      setContent('')
      setHasChanges(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (claudeHome !== null) {
      loadContent(tab)
    }
  }, [tab, projectPath, claudeHome])

  const handleSave = async () => {
    const filePath = getFilePath(tab)
    if (!filePath) return

    setSaving(true)
    try {
      await writeAgentFile(filePath, content)
      setHasChanges(false)
      toast.success(locale === 'it' ? 'CLAUDE.md salvato' : 'CLAUDE.md saved')
    } catch (e) {
      toast.error(`${t('common.error')}: ${e}`)
    } finally {
      setSaving(false)
    }
  }

  const handleTemplate = (key: keyof typeof TEMPLATES) => {
    setContent(TEMPLATES[key].content)
    setHasChanges(true)
  }

  const handleContentChange = (value: string) => {
    setContent(value)
    setHasChanges(true)
  }

  return (
    <div className="p-6 space-y-4 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">CLAUDE.md</h2>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setMode('view')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                mode === 'view' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              }`}
            >
              <EyeIcon className="size-3" /> {locale === 'it' ? 'Anteprima' : 'View'}
            </button>
            <button
              onClick={() => setMode('edit')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                mode === 'edit' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              }`}
            >
              <PencilIcon className="size-3" /> {locale === 'it' ? 'Modifica' : 'Edit'}
            </button>
          </div>
          {mode === 'edit' && (
            <Button onClick={handleSave} disabled={saving || !hasChanges}>
              <SaveIcon className="size-4 mr-1.5" />
              {saving ? '...' : locale === 'it' ? 'Salva' : 'Save'}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <Button
          variant={tab === 'global' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTab('global')}
        >
          <GlobeIcon className="size-3 mr-1.5" />
          Global
        </Button>
        <Button
          variant={tab === 'project' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTab('project')}
          disabled={!projectPath}
        >
          <FolderIcon className="size-3 mr-1.5" />
          {t('common.project')}
        </Button>
        {!projectPath && tab !== 'global' && (
          <span className="text-xs text-muted-foreground">
            {locale === 'it'
              ? 'Seleziona un progetto dalla barra superiore'
              : 'Select a project from the top bar'}
          </span>
        )}
        {hasChanges && (
          <Badge variant="secondary" className="text-xs ml-2">
            {locale === 'it' ? 'Modifiche non salvate' : 'Unsaved changes'}
          </Badge>
        )}
      </div>

      {/* Templates (edit mode only) */}
      {mode === 'edit' && <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">
          {locale === 'it' ? 'Template:' : 'Templates:'}
        </span>
        {Object.entries(TEMPLATES).map(([key, tmpl]) => (
          <Button
            key={key}
            variant="outline"
            size="sm"
            onClick={() => handleTemplate(key as keyof typeof TEMPLATES)}
          >
            <SparklesIcon className="size-3 mr-1.5" />
            {locale === 'it' ? tmpl.labelIt : tmpl.label}
          </Button>
        ))}
      </div>}

      {/* Editor / Viewer */}
      <div className="flex-1 min-h-0 rounded-xl border border-border bg-card overflow-hidden flex flex-col">
        <div className="flex items-center gap-3 p-3 border-b border-border">
          <FileEditIcon className="size-4 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">
            {tab === 'global' ? '~/.claude/CLAUDE.md' : `${projectPath}/CLAUDE.md`}
          </span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center flex-1 p-8">
            <p className="text-muted-foreground">{t('common.loading')}</p>
          </div>
        ) : mode === 'view' ? (
          <div className="flex-1 overflow-auto p-6 prose prose-invert prose-sm max-w-none [&_table]:w-full [&_th]:text-left [&_th]:py-2 [&_th]:px-3 [&_th]:bg-muted/50 [&_th]:text-xs [&_td]:py-2 [&_td]:px-3 [&_td]:border-b [&_td]:border-border [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_blockquote]:border-l-primary [&_blockquote]:bg-primary/5 [&_blockquote]:py-2 [&_blockquote]:px-4 [&_blockquote]:rounded-r-lg">
            {content ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            ) : (
              <p className="text-muted-foreground italic">
                {locale === 'it' ? 'Nessun contenuto. Passa a Modifica per iniziare.' : 'No content. Switch to Edit to get started.'}
              </p>
            )}
          </div>
        ) : (
          <Textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            className="flex-1 border-0 rounded-none font-mono text-sm resize-none focus-visible:ring-0"
            placeholder={locale === 'it'
              ? 'Scrivi le istruzioni per Claude Code...'
              : 'Write instructions for Claude Code...'}
          />
        )}
      </div>
    </div>
  )
}
