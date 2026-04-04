import { invoke } from '@tauri-apps/api/core'
import { toast } from 'sonner'
import { useConfigStore } from '@/store/configStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'

function OpenFolderButton({ path }: { path: string }) {
  const handleOpen = async () => {
    try {
      await invoke('open_folder', { path })
    } catch (e) {
      toast.error(`Errore: ${e}`)
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleOpen} title="Apri cartella">
      📂
    </Button>
  )
}

export function SkillsPage() {
  const skills = useConfigStore((s) => s.skills)
  const installedPlugins = useConfigStore((s) => s.installedPlugins)
  const localSkills = useConfigStore((s) => s.localSkills)
  const loadConfigs = useConfigStore((s) => s.loadConfigs)

  const handleTogglePlugin = async (pluginName: string, marketplace: string, currentEnabled: boolean) => {
    const pluginId = `${pluginName}@${marketplace}`
    try {
      await invoke('toggle_plugin', { pluginId, enabled: !currentEnabled })
      toast.success(`Plugin "${pluginName}" ${!currentEnabled ? 'attivato' : 'disattivato'}`)
      await loadConfigs()
    } catch (e) {
      toast.error(`Errore: ${e}`)
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Skills & Plugins</h2>

      {/* Installed Plugins */}
      {installedPlugins.length > 0 && (
        <>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Plugins Installati</h3>
          <div className="space-y-2 mb-6">
            {installedPlugins.map((plugin) => (
              <div
                key={`${plugin.name}@${plugin.marketplace}`}
                className="flex items-center justify-between rounded-lg border border-border p-4"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{plugin.name}</span>
                    <Badge variant={plugin.enabled ? 'default' : 'outline'} className="text-xs">
                      {plugin.enabled ? 'attivo' : 'disattivato'}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {plugin.scope}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {plugin.marketplace} · v{plugin.version}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={plugin.enabled}
                    onCheckedChange={() =>
                      handleTogglePlugin(plugin.name, plugin.marketplace, plugin.enabled)
                    }
                  />
                  <OpenFolderButton path={plugin.installPath} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Local Skills */}
      {localSkills.length > 0 && (
        <>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Skills Disponibili</h3>
          <div className="space-y-2 mb-6">
            {localSkills.map((skill) => (
              <div
                key={skill.path}
                className="flex items-center justify-between rounded-lg border border-border p-4"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{skill.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {skill.plugin}
                    </Badge>
                  </div>
                  {skill.description && (
                    <p className="text-sm text-muted-foreground truncate">{skill.description}</p>
                  )}
                </div>
                <OpenFolderButton path={skill.path} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Config skills */}
      {skills.length > 0 && (
        <>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Skills da Configurazione</h3>
          <div className="space-y-2">
            {skills.map((skill) => (
              <div
                key={`${skill.scope}-${skill.path}`}
                className="flex items-center justify-between rounded-lg border border-border p-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{skill.name}</span>
                    <Badge variant={skill.scope === 'global' ? 'default' : 'secondary'} className="text-xs">
                      {skill.scope}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground font-mono">{skill.path}</p>
                </div>
                <OpenFolderButton path={skill.path} />
              </div>
            ))}
          </div>
        </>
      )}

      {installedPlugins.length === 0 && localSkills.length === 0 && skills.length === 0 && (
        <p className="text-muted-foreground py-8 text-center">
          Nessuna Skill o Plugin configurato.
        </p>
      )}
    </div>
  )
}
