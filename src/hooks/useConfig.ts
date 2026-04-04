import { useEffect } from 'react'
import { useConfigStore } from '@/store/configStore'

export function useConfig() {
  const loadConfigs = useConfigStore((s) => s.loadConfigs)
  const mode = useConfigStore((s) => s.mode)
  const projectPath = useConfigStore((s) => s.projectPath)

  useEffect(() => {
    loadConfigs()
  }, [loadConfigs, mode, projectPath])
}
