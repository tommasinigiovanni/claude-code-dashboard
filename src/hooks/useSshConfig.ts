import { getSettings } from '@/pages/SettingsPage'

export function getSshConfig() {
  const s = getSettings()
  const profile = s.activeSshProfile
    ? (s.sshProfiles || []).find((p) => p.name === s.activeSshProfile)
    : null
  if (!profile) return null
  return {
    name: profile.name,
    host: profile.host,
    port: profile.port,
    user: profile.user,
    key_path: profile.keyPath || null,
  }
}

export function isRemoteMode(): boolean {
  return !!getSshConfig()
}
