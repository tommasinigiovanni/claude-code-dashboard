import { getTransport } from '../transport'
import type { SshConfig, TmuxSession, EventSubscription } from '../transport'

const transport = () => getTransport()

export async function terminalSpawn(opts: {
  projectPath?: string
  useTmux: boolean
  tmuxAttachSession?: string
  sshConfig?: SshConfig | null
}): Promise<string> {
  return transport().call('terminal_spawn', {
    projectPath: opts.projectPath,
    useTmux: opts.useTmux,
    tmuxAttachSession: opts.tmuxAttachSession,
    sshConfig: opts.sshConfig ?? null,
  })
}

export async function terminalWrite(sessionId: string, data: string): Promise<void> {
  return transport().call('terminal_write', { sessionId, data })
}

export async function terminalResize(sessionId: string, rows: number, cols: number): Promise<void> {
  return transport().call('terminal_resize', { sessionId, rows, cols })
}

export function onTerminalOutput(
  sessionId: string,
  handler: (data: string) => void,
): Promise<EventSubscription> {
  return transport().subscribe('terminal-output', sessionId, handler)
}

/** Unified tmux list — handles SSH vs local internally */
export async function listTmuxSessions(sshConfig?: SshConfig | null): Promise<TmuxSession[]> {
  if (sshConfig) {
    const data = await transport().call('ssh_tmux_list_sessions', { config: sshConfig })
    return data.map(([name, attached, windows, created]) => ({
      name, attached, windows, created,
    }))
  }
  return transport().call('tmux_list_sessions')
}

/** Unified tmux kill — handles SSH vs local internally */
export async function killTmuxSession(sessionName: string, sshConfig?: SshConfig | null): Promise<void> {
  if (sshConfig) {
    return transport().call('ssh_tmux_kill_session', { config: sshConfig, sessionName })
  }
  return transport().call('tmux_kill_session', { sessionName })
}

export async function tmuxSessionCwd(sessionName: string): Promise<string | null> {
  return transport().call('tmux_session_cwd', { sessionName })
}
