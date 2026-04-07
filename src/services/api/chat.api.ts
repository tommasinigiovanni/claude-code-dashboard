import { getTransport } from '../transport'
import type { SshConfig, ChatEvent, EventSubscription } from '../transport'

const transport = () => getTransport()

export async function chatStart(projectPath?: string, sshConfig?: SshConfig | null): Promise<string> {
  return transport().call('chat_start', { projectPath, sshConfig: sshConfig ?? null })
}

export async function chatSend(sessionId: string, message: string): Promise<void> {
  return transport().call('chat_send', { sessionId, message })
}

export async function chatApprove(sessionId: string, approved: boolean): Promise<void> {
  return transport().call('chat_approve', { sessionId, approved })
}

export async function saveTempImage(data: number[], extension: string): Promise<string> {
  return transport().call('save_temp_image', { data, extension })
}

export function onChatEvent(
  sessionId: string,
  handler: (event: ChatEvent) => void,
): Promise<EventSubscription> {
  return transport().subscribe('chat-event', sessionId, handler)
}
