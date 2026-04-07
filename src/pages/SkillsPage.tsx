import { useState } from 'react'
import { openFolder, togglePlugin } from '@/services/api'
import { toast } from 'sonner'
import { useConfigStore } from '@/store/configStore'
import { useI18n } from '@/i18n/useI18n'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  PuzzleIcon, ZapIcon, FolderOpenIcon, SearchIcon,
  PlugIcon, FileCodeIcon, SettingsIcon, PackageOpenIcon,
} from 'lucide-react'

function OpenFolderButton({ path }: { path: string }) {
  const { t } = useI18n()
  return (
    <Button variant="ghost" size="sm" onClick={async () => {
      try { await openFolder(path) } catch (e) { toast.error(`${t('common.error')}: ${e}`) }
    }} title="Open folder">
      <FolderOpenIcon className="size-4 text-muted-foreground" />
    </Button>
  )
}

type FilterType = 'all' | 'plugins' | 'skills'

export function SkillsPage() {
  const skills = useConfigStore((s) => s.skills)
  const installedPlugins = useConfigStore((s) => s.installedPlugins)
  const localSkills = useConfigStore((s) => s.localSkills)
  const loadConfigs = useConfigStore((s) => s.loadConfigs)
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')

  const handleTogglePlugin = async (pluginName: string, marketplace: string, currentEnabled: boolean) => {
    const pluginId = `${pluginName}@${marketplace}`
    try {
      await togglePlugin(pluginId, !currentEnabled)
      toast.success(`Plugin "${pluginName}" ${!currentEnabled ? t('common.activated') : t('common.deactivated')}`)
      await loadConfigs()
    } catch (e) {
      toast.error(`${t('common.error')}: ${e}`)
    }
  }

  const query = search.toLowerCase()
  const pluginCount = installedPlugins.length
  const skillCount = localSkills.length + skills.length

  const filteredPlugins = installedPlugins.filter((p) =>
    p.name.toLowerCase().includes(query)
  )
  const filteredLocalSkills = localSkills.filter((s) =>
    s.name.toLowerCase().includes(query) || s.description?.toLowerCase().includes(query)
  )
  const filteredConfigSkills = skills.filter((s) =>
    s.name.toLowerCase().includes(query) || s.path.toLowerCase().includes(query)
  )

  const showPlugins = filter === 'all' || filter === 'plugins'
  const showSkills = filter === 'all' || filter === 'skills'
  const hasAny = pluginCount > 0 || skillCount > 0
  const hasResults = (showPlugins && filteredPlugins.length > 0) ||
    (showSkills && (filteredLocalSkills.length > 0 || filteredConfigSkills.length > 0))

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t('skills.title')}</h2>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
            <PuzzleIcon className="size-3.5 text-primary" />
          </div>
          <span className="font-medium">{pluginCount + skillCount}</span>
          <span className="text-muted-foreground">total</span>
        </div>
        <Separator orientation="vertical" className="h-5" />
        <div className="flex items-center gap-1.5 text-sm">
          <PlugIcon className="size-3.5 text-muted-foreground" />
          <span className="font-medium">{pluginCount}</span>
          <span className="text-muted-foreground">{t('skills.statsPlugins')}</span>
        </div>
        <Separator orientation="vertical" className="h-5" />
        <div className="flex items-center gap-1.5 text-sm">
          <ZapIcon className="size-3.5 text-muted-foreground" />
          <span className="font-medium">{skillCount}</span>
          <span className="text-muted-foreground">{t('skills.statsSkills')}</span>
        </div>
      </div>

      {/* Search + filter tabs */}
      {hasAny && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('skills.searchPlaceholder')}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1">
            {(['all', 'plugins', 'skills'] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? t('skills.filterAll') : f === 'plugins' ? t('skills.filterPlugins') : t('skills.filterSkills')}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Installed Plugins */}
      {showPlugins && filteredPlugins.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3 p-4">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <PlugIcon className="size-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold">{t('skills.installedPlugins')}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{filteredPlugins.length} plugin{filteredPlugins.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <Separator />
          <div className="p-4 space-y-2">
            {filteredPlugins.map((plugin) => (
              <div key={`${plugin.name}@${plugin.marketplace}`} className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{plugin.name}</span>
                    <Badge variant={plugin.enabled ? 'default' : 'outline'} className="text-xs">
                      {plugin.enabled ? t('skills.active') : t('skills.disabled')}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">{plugin.scope}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{plugin.marketplace} · v{plugin.version}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={plugin.enabled} onCheckedChange={() => handleTogglePlugin(plugin.name, plugin.marketplace, plugin.enabled)} />
                  <OpenFolderButton path={plugin.installPath} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Skills (local) */}
      {showSkills && filteredLocalSkills.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3 p-4">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <FileCodeIcon className="size-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold">{t('skills.availableSkills')}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{filteredLocalSkills.length} skill{filteredLocalSkills.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <Separator />
          <div className="p-4 space-y-2">
            {filteredLocalSkills.map((skill) => (
              <div key={skill.path} className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{skill.name}</span>
                    <Badge variant="outline" className="text-xs">{skill.plugin}</Badge>
                  </div>
                  {skill.description && <p className="text-xs text-muted-foreground truncate">{skill.description}</p>}
                </div>
                <OpenFolderButton path={skill.path} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Configuration Skills */}
      {showSkills && filteredConfigSkills.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3 p-4">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <SettingsIcon className="size-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold">{t('skills.configSkills')}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{filteredConfigSkills.length} skill{filteredConfigSkills.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <Separator />
          <div className="p-4 space-y-2">
            {filteredConfigSkills.map((skill) => (
              <div key={`${skill.scope}-${skill.path}`} className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{skill.name}</span>
                    <Badge variant={skill.scope === 'global' ? 'default' : 'secondary'} className="text-xs">
                      {skill.scope === 'global' ? t('common.global') : t('common.project')}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono truncate">{skill.path}</p>
                </div>
                <OpenFolderButton path={skill.path} />
              </div>
            ))}
          </div>
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
            <PackageOpenIcon className="size-7 text-muted-foreground/60" />
          </div>
          <p className="text-sm font-medium mb-1">{t('skills.noSkills')}</p>
          <p className="text-xs text-muted-foreground max-w-xs">{t('skills.emptyDesc')}</p>
        </div>
      )}
    </div>
  )
}
