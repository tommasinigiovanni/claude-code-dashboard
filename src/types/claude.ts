// ─── MCP Server (local) ───────────────────────────────

export interface McpServer {
  command: string
  args?: string[]
  env?: Record<string, string>
}

export type McpServersMap = Record<string, McpServer>

// ─── Cloud MCP Connector ──────────────────────────────

export interface CloudMcpConnector {
  name: string
  needsAuth: boolean
}

// ─── Installed Plugin ─────────────────────────────────

export interface InstalledPlugin {
  name: string
  marketplace: string
  scope: string
  version: string
  installPath: string
  enabled: boolean
  projectPath?: string
}

// ─── Skill ────────────────────────────────────────────

export interface Skill {
  name: string
  path: string
}

// ─── Sub-agent ────────────────────────────────────────

export interface SubAgent {
  description?: string
  prompt: string
  enabled?: boolean
}

export type AgentsMap = Record<string, SubAgent>

// ─── Config root ──────────────────────────────────────

export interface ClaudeConfig {
  mcpServers?: McpServersMap
  skills?: Skill[]
  agents?: AgentsMap
}

// ─── Local Skill (from plugin SKILL.md) ──────────────

export interface LocalSkill {
  name: string
  description: string
  plugin: string
  path: string
}

// ─── Local Agent (from plugin agents/*.md) ────────────

export interface LocalAgent {
  name: string
  description: string
  plugin: string
  path: string
}

// ─── Dashboard data from backend ──────────────────────

export interface DashboardData {
  config: ClaudeConfig
  cloudConnectors: CloudMcpConnector[]
  installedPlugins: InstalledPlugin[]
  localSkills: LocalSkill[]
  localAgents: LocalAgent[]
  recentProjects: string[]
}

// ─── Config scope ─────────────────────────────────────

export type ConfigScope = 'global' | 'project'

// ─── Entità arricchite per la UI ──────────────────────

export interface McpServerUI extends McpServer {
  id: string
  enabled: boolean
  scope: ConfigScope
}

export interface SkillUI extends Skill {
  description?: string
  scope: ConfigScope
}

export interface SubAgentUI extends SubAgent {
  id: string
  scope: ConfigScope
}
