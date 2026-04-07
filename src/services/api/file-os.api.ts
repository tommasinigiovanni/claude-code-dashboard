import { getTransport } from '../transport'

const transport = () => getTransport()

export async function openFolder(path: string): Promise<void> {
  return transport().call('open_folder', { path })
}

export async function pickDirectory(): Promise<string | null> {
  return transport().call('pick_directory')
}

export async function togglePlugin(pluginId: string, enabled: boolean): Promise<void> {
  return transport().call('toggle_plugin', { pluginId, enabled })
}
