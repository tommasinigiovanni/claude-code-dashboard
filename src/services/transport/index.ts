import type { Transport } from './types'
import { TauriTransport } from './tauri.transport'
import { WebSocketTransport } from './websocket.transport'

let instance: Transport | null = null

export function getTransport(): Transport {
  if (!instance) {
    if (import.meta.env.VITE_TRANSPORT === 'websocket') {
      const wsUrl = import.meta.env.VITE_WS_URL
        || `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`
      const token = new URLSearchParams(location.search).get('token') || ''
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
