import { getTransport } from '../transport'
import type { HooksData } from '../transport'

const transport = () => getTransport()

export async function readHooks(): Promise<HooksData> {
  return transport().call('read_hooks')
}

export async function writeHooks(hooks: HooksData): Promise<void> {
  return transport().call('write_hooks', { hooks })
}
