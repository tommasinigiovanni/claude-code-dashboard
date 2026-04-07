import type {
  ClaudeConfig,
  ConfigScope,
  DashboardData,
  LocalSkill,
} from '@/types/claude'

// ─── SSH Config ──────────────────────────────────────

export interface SshConfig {
  name: string
  host: string
  port: number
  user: string
  key_path: string | null
}

// ─── Domain types used by commands ───────────────────

export interface TmuxSession {
  name: string
  attached: boolean
  windows: number
  created: string
}

export interface ChatEvent {
  session_id: string
  event_type: string
  content: string
}

export interface Profile {
  name: string
  description: string
  created_at: string
}

export interface Backup {
  filename: string
  timestamp: number
  size_bytes: number
}

export interface VerificationResult {
  output: string
  success: boolean
  duration_ms: number
}

export interface LogEntry {
  timestamp: string
  entry_type: string
  content: string
  session_id: string
}

export interface UsageEntry {
  date: string
  cost_usd: number
  input_tokens: number
  output_tokens: number
  sessions: number
  project: string
}

export interface MemoryFile {
  name: string
  description: string
  memory_type: string
  content: string
  project: string
  path: string
}

export interface TelegramBotStatus {
  running: boolean
  bot_name: string | null
}

// HooksData: Record<EventType, HookMatcher[]>
interface HookCommand {
  type: 'command'
  command: string
  timeout?: number
}

interface HookMatcher {
  matcher: string
  hooks: HookCommand[]
}

export type HooksData = Record<string, HookMatcher[]>

// ─── Command Map ─────────────────────────────────────

export interface CommandMap {
  // Config
  read_config: { params: { scope: ConfigScope; projectPath?: string }; result: ClaudeConfig }
  write_config: { params: { scope: ConfigScope; projectPath?: string; config: ClaudeConfig }; result: void }
  read_dashboard_data: { params: void; result: DashboardData }
  read_project_extras: { params: { projectPath: string }; result: [LocalSkill[], LocalSkill[]] }

  // SSH Config
  ssh_read_config: { params: { config: SshConfig; remotePath: string }; result: string }
  ssh_write_config: { params: { config: SshConfig; remotePath: string; content: string }; result: void }
  ssh_read_dashboard_data: { params: { config: SshConfig }; result: DashboardData & { tmuxSessions?: unknown[] } }
  ssh_test_connection: { params: { config: SshConfig }; result: string }

  // Terminal
  terminal_spawn: { params: { projectPath?: string; useTmux: boolean; tmuxAttachSession?: string; sshConfig?: SshConfig | null }; result: string }
  terminal_write: { params: { sessionId: string; data: string }; result: void }
  terminal_resize: { params: { sessionId: string; rows: number; cols: number }; result: void }

  // Tmux
  tmux_list_sessions: { params: void; result: TmuxSession[] }
  tmux_kill_session: { params: { sessionName: string }; result: void }
  tmux_session_cwd: { params: { sessionName: string }; result: string | null }
  ssh_tmux_list_sessions: { params: { config: SshConfig }; result: [string, boolean, number, string][] }
  ssh_tmux_kill_session: { params: { config: SshConfig; sessionName: string }; result: void }

  // Chat
  chat_start: { params: { projectPath?: string; sshConfig?: SshConfig | null }; result: string }
  chat_send: { params: { sessionId: string; message: string }; result: void }
  chat_approve: { params: { sessionId: string; approved: boolean }; result: void }
  save_temp_image: { params: { data: number[]; extension: string }; result: string }

  // Telegram
  telegram_bot_status: { params: void; result: TelegramBotStatus }
  telegram_start_bot: { params: { botToken: string; allowedChatId: number | null; projectPath: string | null; autoApprove: boolean }; result: TelegramBotStatus }
  telegram_stop_bot: { params: void; result: void }

  // Profiles
  list_profiles: { params: void; result: Profile[] }
  save_profile: { params: { name: string; description: string }; result: void }
  load_profile: { params: { name: string }; result: void }
  delete_profile: { params: { name: string }; result: void }

  // Hooks
  read_hooks: { params: void; result: HooksData }
  write_hooks: { params: { hooks: HooksData }; result: void }

  // Agent files
  read_agent_file: { params: { path: string }; result: string }
  write_agent_file: { params: { path: string; content: string }; result: void }
  delete_agent_file: { params: { path: string }; result: void }

  // File/OS
  open_folder: { params: { path: string }; result: void }
  pick_directory: { params: void; result: string | null }
  toggle_plugin: { params: { pluginId: string; enabled: boolean }; result: void }

  // Backups
  list_backups: { params: void; result: Backup[] }
  auto_backup: { params: void; result: string }
  restore_backup: { params: { filename: string }; result: void }
  delete_backup: { params: { filename: string }; result: void }

  // Health
  health_check_mcp: { params: void; result: [string, boolean, string][] }
  ssh_health_check_mcp: { params: { config: SshConfig }; result: [string, boolean, string][] }

  // Monitoring
  read_session_logs: { params: { projectPath?: string | null; maxEntries?: number }; result: LogEntry[] }
  read_usage_stats: { params: void; result: UsageEntry[] }
  read_memories: { params: { projectPath?: string | null }; result: MemoryFile[] }
  run_verification: { params: { prompt: string; projectPath?: string | null }; result: VerificationResult }

  // System
  get_claude_home: { params: void; result: string }

  // Launcher
  check_claude_installed: { params: void; result: boolean }
  launch_claude_code: { params: { projectPath?: string; terminalApp: string }; result: void }
  export_config: { params: void; result: string }
  import_config: { params: { bundleJson: string }; result: string }
}

// ─── Utility types ───────────────────────────────────

export type CommandName = keyof CommandMap
export type CommandParams<C extends CommandName> = CommandMap[C]['params']
export type CommandResult<C extends CommandName> = CommandMap[C]['result']

// ─── Event Map ───────────────────────────────────────

export interface EventMap {
  'terminal-output': string
  'chat-event': ChatEvent
}

export type EventName = keyof EventMap

export interface EventSubscription {
  unsubscribe: () => void
}

// ─── Transport Interface ─────────────────────────────

export interface Transport {
  call<C extends CommandName>(
    command: C,
    ...args: CommandParams<C> extends void ? [] : [CommandParams<C>]
  ): Promise<CommandResult<C>>

  subscribe<E extends EventName>(
    event: E,
    channelId: string,
    handler: (payload: EventMap[E]) => void,
  ): Promise<EventSubscription>

  destroy(): void
}
