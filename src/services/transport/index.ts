import type { Transport } from './types'
import { TauriTransport } from './tauri.transport'
import { WebSocketTransport } from './websocket.transport'

let instance: Transport | null = null

const TOKEN_KEY = 'ccd-token'

export function isWebMode(): boolean {
  return import.meta.env.VITE_TRANSPORT === 'websocket'
}

export function getStoredToken(): string {
  const urlToken = new URLSearchParams(location.search).get('token')
  if (urlToken) {
    localStorage.setItem(TOKEN_KEY, urlToken)
    // Clean token from URL without reload
    const url = new URL(location.href)
    url.searchParams.delete('token')
    history.replaceState(null, '', url.toString())
  }
  return urlToken || localStorage.getItem(TOKEN_KEY) || ''
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
  // Reset transport so it reconnects with new token
  if (instance) {
    instance.destroy()
    instance = null
  }
}

export function getTransport(): Transport {
  if (!instance) {
    if (isWebMode()) {
      const wsUrl = import.meta.env.VITE_WS_URL
        || `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`
      const token = getStoredToken()
      instance = new WebSocketTransport(`${wsUrl}?token=${token}`)
    } else {
      instance = new TauriTransport()
    }
  }
  return instance
}

export type {
  Transport,
  CommandMap,
  CommandName,
  CommandParams,
  CommandResult,
  EventMap,
  EventName,
  EventSubscription,
  SshConfig,
  TmuxSession,
  ChatEvent,
  Profile,
  Backup,
  VerificationResult,
  LogEntry,
  UsageEntry,
  MemoryFile,
  TelegramBotStatus,
  HooksData,
} from './types'
