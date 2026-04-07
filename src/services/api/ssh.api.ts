import { getTransport } from '../transport'
import type { SshConfig } from '../transport'

const transport = () => getTransport()

export async function sshTestConnection(config: SshConfig): Promise<string> {
  return transport().call('ssh_test_connection', { config })
}
