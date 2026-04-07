import { getTransport } from '../transport'
import type { SshConfig } from '../transport'

const transport = () => getTransport()

/** Unified health check — handles SSH vs local internally */
export async function healthCheckMcp(sshConfig?: SshConfig | null): Promise<[string, boolean, string][]> {
  if (sshConfig) {
    return transport().call('ssh_health_check_mcp', { config: sshConfig })
  }
  return transport().call('health_check_mcp')
}
