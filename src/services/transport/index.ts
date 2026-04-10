import type { Transport } from './types'
import { TauriTransport } from './tauri.transport'
import { WebSocketTransport } from './websocket.transport'

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string
        ready: () => void
        expand: () => void
        themeParams?: Record<string, string>
      }
    }
  }
}

let instance: Transport | null = null

const TOKEN_KEY = 'ccd-token'
const TG_SESSION_KEY = 'ccd-tg-session'

export function isWebMode(): boolean {
  return import.meta.env.VITE_TRANSPORT === 'websocket'
}

export function isTelegramWebApp(): boolean {
  return !!window.Telegram?.WebApp?.initData
}

export async function initTelegramAuth(): Promise<boolean> {
  const tg = window.Telegram?.WebApp
  if (!tg?.initData) return false

  tg.ready()
  tg.expand()

  // Check existing session
  const existing = localStorage.getItem(TG_SESSION_KEY)
  if (existing) return true

  try {
    const resp = await fetch('/tg-auth', { method: 'POST', body: tg.initData })
    if (!resp.ok) return false
    const data = await resp.json()
    localStorage.setItem(TG_SESSION_KEY, data.token)
    return true
  } catch {
    return false
  }
}

export function getStoredToken(): string {
  const urlToken = new URLSearchParams(location.search).get('token')
  if (urlToken) {
    localStorage.setItem(TOKEN_KEY, urlToken)
    const url = new URL(location.href)
    url.searchParams.delete('token')
    history.replaceState(null, '', url.toString())
  }
  return urlToken || localStorage.getItem(TOKEN_KEY) || ''
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
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

      // Telegram session takes priority
      const tgSession = localStorage.getItem(TG_SESSION_KEY)
      if (tgSession) {
        instance = new WebSocketTransport(`${wsUrl}?tg_session=${tgSession}`)
        return instance
      }

      // Fall back to static token
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
