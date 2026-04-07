import { pickDirectory } from '@/services/api'
import { useConfigStore } from '@/store/configStore'
import { getSshConfig } from '@/hooks/useSshConfig'
import { useI18n } from '@/i18n/useI18n'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
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
  const { t } = useI18n()
  const sshProfile = getSshConfig()
  const isRemote = !!sshProfile
  const [remoteInput, setRemoteInput] = useState('')

  const handleSelectProject = () => {
    if (isRemote) return // handled by input below
    setTimeout(async () => {
      try {
        const selected = await pickDirectory()
        if (selected) {
          switchToProject(selected)
        }
      } catch (e) {
        console.error('Failed to open directory picker:', e)
      }
    }, 100)
  }

  const label = mode === 'global'
    ? t('topbar.global')
    : projectPath?.split('/').pop() ?? t('common.project')

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
        {isRemote && (
          <>
            <div className="px-2 py-1.5">
              <p className="text-xs text-primary font-medium">🖥️ {sshProfile.name}</p>
              <p className="text-xs text-muted-foreground">{sshProfile.user}@{sshProfile.host}</p>
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={() => switchToGlobal()}>
          <span className="mr-2">🌐</span>
          {t('topbar.global')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {isRemote ? (
          <div className="px-2 py-1.5">
            <Input
              value={remoteInput}
              onChange={(e) => setRemoteInput(e.target.value)}
              placeholder="/root/project"
              className="h-8 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && remoteInput.trim()) {
                  switchToProject(remoteInput.trim())
                  setRemoteInput('')
                }
              }}
            />
          </div>
        ) : (
          <DropdownMenuItem onClick={handleSelectProject}>
            <span className="mr-2">📁</span>
            {t('topbar.selectProject')}
          </DropdownMenuItem>
        )}
        {recentProjects.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>{t('topbar.recentProjects')}</DropdownMenuLabel>
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
