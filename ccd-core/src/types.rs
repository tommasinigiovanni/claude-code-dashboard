use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ─── MCP Server (local) ──────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct McpServer {
    pub command: String,
    pub args: Option<Vec<String>>,
    pub env: Option<HashMap<String, String>>,
}

// ─── Skill ────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Skill {
    pub name: String,
    pub path: String,
}

// ─── Sub-agent ────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SubAgent {
    pub description: Option<String>,
    pub prompt: String,
    pub enabled: Option<bool>,
}

// ─── Cloud MCP Connector ──────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CloudMcpConnector {
    pub name: String,
    pub needs_auth: bool,
}

// ─── Installed Plugin ─────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InstalledPlugin {
    pub name: String,
    pub marketplace: String,
    pub scope: String,
    pub version: String,
    #[serde(rename = "installPath")]
    pub install_path: String,
    pub enabled: bool,
    #[serde(rename = "projectPath", skip_serializing_if = "Option::is_none")]
    pub project_path: Option<String>,
}

// ─── Local Skill (from plugin SKILL.md) ──────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LocalSkill {
    pub name: String,
    pub description: String,
    pub plugin: String,
    pub path: String,
}

// ─── Local Agent (from plugin agents/*.md) ────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LocalAgent {
    pub name: String,
    pub description: String,
    pub plugin: String,
    pub path: String,
}

// ─── Config root ──────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct ClaudeConfig {
    #[serde(rename = "mcpServers", skip_serializing_if = "Option::is_none", default)]
    pub mcp_servers: Option<HashMap<String, McpServer>>,

    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub skills: Option<Vec<Skill>>,

    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub agents: Option<HashMap<String, SubAgent>>,
}

// ─── Full dashboard data ──────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct DashboardData {
    pub config: ClaudeConfig,
    #[serde(rename = "cloudConnectors")]
    pub cloud_connectors: Vec<CloudMcpConnector>,
    #[serde(rename = "installedPlugins")]
    pub installed_plugins: Vec<InstalledPlugin>,
    #[serde(rename = "localSkills")]
    pub local_skills: Vec<LocalSkill>,
    #[serde(rename = "localAgents")]
    pub local_agents: Vec<LocalAgent>,
    #[serde(rename = "recentProjects")]
    pub recent_projects: Vec<String>,
}
