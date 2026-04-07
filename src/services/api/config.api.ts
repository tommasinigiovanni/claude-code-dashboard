import { getTransport } from '../transport'
import type { SshConfig } from '../transport'
import type { ClaudeConfig, ConfigScope, DashboardData, LocalSkill } from '@/types/claude'

const transport = () => getTransport()

export async function readConfig(scope: ConfigScope, projectPath?: string): Promise<ClaudeConfig> {
  return transport().call('read_config', { scope, projectPath })
}

export async function writeConfig(scope: ConfigScope, config: ClaudeConfig, projectPath?: string): Promise<void> {
  return transport().call('write_config', { scope, projectPath, config })
}

export async function readDashboardData(): Promise<DashboardData> {
  return transport().call('read_dashboard_data')
}

export async function readProjectExtras(projectPath: string): Promise<[LocalSkill[], LocalSkill[]]> {
  return transport().call('read_project_extras', { projectPath })
}

export async function sshReadConfig(config: SshConfig, remotePath: string): Promise<string> {
  return transport().call('ssh_read_config', { config, remotePath })
}

export async function sshWriteConfig(config: SshConfig, remotePath: string, content: string): Promise<void> {
  return transport().call('ssh_write_config', { config, remotePath, content })
}

export async function sshReadDashboardData(config: SshConfig): Promise<DashboardData & { tmuxSessions?: unknown[] }> {
  return transport().call('ssh_read_dashboard_data', { config })
}

export async function exportConfig(): Promise<string> {
  return transport().call('export_config')
}

export async function importConfig(bundleJson: string): Promise<string> {
  return transport().call('import_config', { bundleJson })
}
