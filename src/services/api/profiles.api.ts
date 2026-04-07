import { getTransport } from '../transport'
import type { Profile } from '../transport'

const transport = () => getTransport()

export async function listProfiles(): Promise<Profile[]> {
  return transport().call('list_profiles')
}

export async function saveProfile(name: string, description: string): Promise<void> {
  return transport().call('save_profile', { name, description })
}

export async function loadProfile(name: string): Promise<void> {
  return transport().call('load_profile', { name })
}

export async function deleteProfile(name: string): Promise<void> {
  return transport().call('delete_profile', { name })
}
