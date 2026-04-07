import { getTransport } from '../transport'
import type { Backup } from '../transport'

const transport = () => getTransport()

export async function listBackups(): Promise<Backup[]> {
  return transport().call('list_backups')
}

export async function autoBackup(): Promise<string> {
  return transport().call('auto_backup')
}

export async function restoreBackup(filename: string): Promise<void> {
  return transport().call('restore_backup', { filename })
}

export async function deleteBackup(filename: string): Promise<void> {
  return transport().call('delete_backup', { filename })
}
