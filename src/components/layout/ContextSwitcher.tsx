import { invoke } from '@tauri-apps/api/core'
import { useConfigStore } from '@/store/configStore'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'

export function ContextSwitcher() {
  const { mode, projectPath, switchToGlobal, switchToProject, recentProjects } = useConfigStore()

  const handleSelectProject = () => {
    setTimeout(async () => {
      try {
        const selected = await invoke<string | null>('pick_directory')
        if (selected) {
          switchToProject(selected)
        }
      } catch (e) {
        console.error('Failed to open directory picker:', e)
      }
    }, 100)
  }

  const label = mode === 'global'
    ? 'Global'
    : projectPath?.split('/').pop() ?? 'Project'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent transition-colors">
        <Badge variant={mode === 'global' ? 'default' : 'secondary'} className="text-xs">
          {mode === 'global' ? 'G' : 'P'}
        </Badge>
        <span>{label}</span>
        <span className="text-muted-foreground">▾</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuItem onClick={() => switchToGlobal()}>
          <span className="mr-2">🌐</span>
          Global
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSelectProject}>
          <span className="mr-2">📁</span>
          Seleziona progetto…
        </DropdownMenuItem>
        {recentProjects.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Progetti recenti</DropdownMenuLabel>
              {recentProjects.slice(0, 10).map((path) => {
                const parts = path.split('/').filter(Boolean)
                const shortName = parts.slice(-2).join('/')
                return (
                  <DropdownMenuItem key={path} onClick={() => switchToProject(path)} title={path}>
                    <span className="text-sm">{shortName}</span>
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
