import { create } from 'zustand'
import {
  readConfig, writeConfig as apiWriteConfig, readDashboardData, readProjectExtras,
  sshReadConfig, sshWriteConfig, sshReadDashboardData,
} from '@/services/api'
import { getSshConfig } from '@/hooks/useSshConfig'
import type {
  ClaudeConfig,
  ConfigScope,
  CloudMcpConnector,
  InstalledPlugin,
  LocalAgent,
  LocalSkill,
  McpServer,
  McpServerUI,
  SkillUI,
  SubAgent,
  SubAgentUI,
} from '@/types/claude'

export type ScopeMode = 'global' | 'project'

interface ConfigState {
  mode: ScopeMode
  projectPath: string | null
  globalConfig: ClaudeConfig | null
  projectConfig: ClaudeConfig | null
  isLoading: boolean
  error: string | null

  // Entità UI derivate
  mcpServers: McpServerUI[]
  skills: SkillUI[]
  subAgents: SubAgentUI[]

  // Cloud, plugins & skills
  cloudConnectors: CloudMcpConnector[]
  installedPlugins: InstalledPlugin[]
  localSkills: LocalSkill[]
  localAgents: LocalAgent[]
  recentProjects: string[]

  // Scope actions
  switchToGlobal: () => void
  switchToProject: (path: string) => void
  loadConfigs: () => Promise<void>

  // MCP actions
  addMcp: (id: string, server: McpServer, scope: ConfigScope) => Promise<void>
  updateMcp: (id: string, server: McpServer, scope: ConfigScope) => Promise<void>
  removeMcp: (id: string, scope: ConfigScope) => Promise<void>

  // Sub-agent actions
  addSubAgent: (id: string, agent: SubAgent, scope: ConfigScope) => Promise<void>
  updateSubAgent: (id: string, agent: SubAgent, scope: ConfigScope) => Promise<void>
  removeSubAgent: (id: string, scope: ConfigScope) => Promise<void>
}

function mergeConfigs(
  globalConfig: ClaudeConfig | null,
  projectConfig: ClaudeConfig | null,
  mode: ScopeMode
): { mcpServers: McpServerUI[]; skills: SkillUI[]; subAgents: SubAgentUI[] } {
  const mcpMap = new Map<string, McpServerUI>()
  const skillMap = new Map<string, SkillUI>()
  const agentMap = new Map<string, SubAgentUI>()

  if (globalConfig?.mcpServers) {
    for (const [id, server] of Object.entries(globalConfig.mcpServers)) {
      mcpMap.set(id, { ...server, id, enabled: true, scope: 'global' })
    }
  }

  if (mode === 'project' && projectConfig?.mcpServers) {
    for (const [id, server] of Object.entries(projectConfig.mcpServers)) {
      mcpMap.set(id, { ...server, id, enabled: true, scope: 'project' })
    }
  }

  if (globalConfig?.skills) {
    for (const skill of globalConfig.skills) {
      skillMap.set(skill.path, { ...skill, scope: 'global' })
    }
  }

  if (mode === 'project' && projectConfig?.skills) {
    for (const skill of projectConfig.skills) {
      skillMap.set(skill.path, { ...skill, scope: 'project' })
    }
  }

  if (globalConfig?.agents) {
    for (const [id, agent] of Object.entries(globalConfig.agents)) {
      agentMap.set(id, { ...agent, id, scope: 'global' })
    }
  }

  if (mode === 'project' && projectConfig?.agents) {
    for (const [id, agent] of Object.entries(projectConfig.agents)) {
      agentMap.set(id, { ...agent, id, scope: 'project' })
    }
  }

  return {
    mcpServers: Array.from(mcpMap.values()),
    skills: Array.from(skillMap.values()),
    subAgents: Array.from(agentMap.values()),
  }
}

function getConfigForScope(state: ConfigState, scope: ConfigScope): ClaudeConfig {
  if (scope === 'global') {
    return state.globalConfig ?? {}
  }
  return state.projectConfig ?? {}
}

async function writeConfig(state: ConfigState, scope: ConfigScope, config: ClaudeConfig) {
  const sshConfig = getSshConfig()
  if (sshConfig) {
    // Remote: serialize config and write via SSH
    const remotePath = scope === 'project' && state.projectPath
      ? `${state.projectPath}/.claude/settings.local.json`
      : '~/.claude/settings.json'

    // Read existing remote config, merge, write back
    const existingJson = await sshReadConfig(sshConfig, remotePath)
    const existing = JSON.parse(existingJson || '{}')

    if (config.mcpServers !== undefined) existing.mcpServers = config.mcpServers
    if (config.agents !== undefined) existing.agents = config.agents
    if (config.skills !== undefined) existing.skills = config.skills

    await sshWriteConfig(sshConfig, remotePath, JSON.stringify(existing, null, 2))
  } else {
    // Local
    await apiWriteConfig(scope, config, scope === 'project' ? state.projectPath ?? undefined : undefined)
  }
}

// getWriteArgs removed — replaced by writeConfig() which handles SSH

export const useConfigStore = create<ConfigState>((set, get) => ({
  mode: 'global',
  projectPath: null,
  globalConfig: null,
  projectConfig: null,
  isLoading: false,
  error: null,
  mcpServers: [],
  skills: [],
  subAgents: [],
  cloudConnectors: [],
  installedPlugins: [],
  localSkills: [],
  localAgents: [],
  recentProjects: [],

  switchToGlobal: () => {
    set({ mode: 'global', projectPath: null, projectConfig: null })
    get().loadConfigs()
  },

  switchToProject: (path: string) => {
    set({ mode: 'project', projectPath: path })
    get().loadConfigs()
  },

  loadConfigs: async () => {
    const { mode, projectPath } = get()
    set({ isLoading: true, error: null })

    try {
      // Check if SSH is active
      const sshConfig = getSshConfig()

      if (sshConfig) {
        // SSH mode: read all data from remote machine in one call
        const remoteData = await sshReadDashboardData(sshConfig)

        const globalConfig = remoteData.config || {}
        const merged = mergeConfigs(globalConfig, null, 'global')

        set({
          globalConfig,
          projectConfig: null,
          ...merged,
          cloudConnectors: remoteData.cloudConnectors || [],
          installedPlugins: remoteData.installedPlugins || [],
          localSkills: remoteData.localSkills || [],
          localAgents: remoteData.localAgents || [],
          recentProjects: remoteData.recentProjects || [],
          isLoading: false,
        })
        return
      }

      // Local mode: load full dashboard data
      const dashboardData = await readDashboardData()

      const globalConfig = dashboardData.config

      let projectConfig: ClaudeConfig | null = null
      if (mode === 'project' && projectPath) {
        projectConfig = await readConfig('project', projectPath)
      }

      const merged = mergeConfigs(globalConfig, projectConfig, mode)

      // Load project-local skills if in project mode
      let allLocalSkills = dashboardData.localSkills
      if (mode === 'project' && projectPath) {
        try {
          const [projectSkills] = await readProjectExtras(projectPath)
          allLocalSkills = [
            ...allLocalSkills,
            ...projectSkills.map((s) => ({ ...s, plugin: 'project' })),
          ]
        } catch {
          // Ignore errors reading project extras
        }
      }

      set({
        globalConfig,
        projectConfig,
        ...merged,
        cloudConnectors: dashboardData.cloudConnectors,
        installedPlugins: dashboardData.installedPlugins,
        localSkills: allLocalSkills,
        localAgents: dashboardData.localAgents,
        recentProjects: dashboardData.recentProjects,
        isLoading: false,
      })
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : String(e),
        isLoading: false,
      })
    }
  },

  addMcp: async (id, server, scope) => {
    const state = get()
    const config = { ...getConfigForScope(state, scope) }
    config.mcpServers = { ...config.mcpServers, [id]: server }
    await writeConfig(state, scope, config)
    await get().loadConfigs()
  },

  updateMcp: async (id, server, scope) => {
    const state = get()
    const config = { ...getConfigForScope(state, scope) }
    config.mcpServers = { ...config.mcpServers, [id]: server }
    await writeConfig(state, scope, config)
    await get().loadConfigs()
  },

  removeMcp: async (id, scope) => {
    const state = get()
    const config = { ...getConfigForScope(state, scope) }
    const servers = { ...config.mcpServers }
    delete servers[id]
    config.mcpServers = servers
    await writeConfig(state, scope, config)
    await get().loadConfigs()
  },

  addSubAgent: async (id, agent, scope) => {
    const state = get()
    const config = { ...getConfigForScope(state, scope) }
    config.agents = { ...config.agents, [id]: agent }
    await writeConfig(state, scope, config)
    await get().loadConfigs()
  },

  updateSubAgent: async (id, agent, scope) => {
    const state = get()
    const config = { ...getConfigForScope(state, scope) }
    config.agents = { ...config.agents, [id]: agent }
    await writeConfig(state, scope, config)
    await get().loadConfigs()
  },

  removeSubAgent: async (id, scope) => {
    const state = get()
    const config = { ...getConfigForScope(state, scope) }
    const agents = { ...config.agents }
    delete agents[id]
    config.agents = agents
    await writeConfig(state, scope, config)
    await get().loadConfigs()
  },
}))
