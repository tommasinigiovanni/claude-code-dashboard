import { getTransport } from '../transport'

const transport = () => getTransport()

export async function getClaudeHome(): Promise<string> {
  return transport().call('get_claude_home')
}

export async function checkClaudeInstalled(): Promise<boolean> {
  return transport().call('check_claude_installed')
}

export async function launchClaudeCode(projectPath?: string, terminalApp?: string): Promise<void> {
  return transport().call('launch_claude_code', { projectPath, terminalApp: terminalApp ?? 'Terminal' })
}
