import { getTransport } from '../transport'
import type { LogEntry, UsageEntry, MemoryFile, VerificationResult } from '../transport'

const transport = () => getTransport()

export async function readSessionLogs(projectPath?: string | null, maxEntries?: number): Promise<LogEntry[]> {
  return transport().call('read_session_logs', { projectPath, maxEntries })
}

export async function readUsageStats(): Promise<UsageEntry[]> {
  return transport().call('read_usage_stats')
}

export async function readMemories(projectPath?: string | null): Promise<MemoryFile[]> {
  return transport().call('read_memories', { projectPath })
}

export async function runVerification(prompt: string, projectPath?: string | null): Promise<VerificationResult> {
  return transport().call('run_verification', { prompt, projectPath })
}
