import { getTransport } from '../transport'

const transport = () => getTransport()

export async function readAgentFile(path: string): Promise<string> {
  return transport().call('read_agent_file', { path })
}

export async function writeAgentFile(path: string, content: string): Promise<void> {
  return transport().call('write_agent_file', { path, content })
}

export async function deleteAgentFile(path: string): Promise<void> {
  return transport().call('delete_agent_file', { path })
}
