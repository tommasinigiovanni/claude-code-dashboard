use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

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

fn get_claude_dir() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("Home directory not found")?;
    Ok(home.join(".claude"))
}

fn get_config_path(scope: &str, project_path: Option<&str>) -> Result<PathBuf, String> {
    match scope {
        "global" => {
            Ok(get_claude_dir()?.join("settings.json"))
        }
        "project" => {
            let path = project_path.ok_or("Project path required for project scope")?;
            let local_path = PathBuf::from(path).join(".claude").join("settings.local.json");
            if local_path.exists() {
                Ok(local_path)
            } else {
                Ok(PathBuf::from(path).join(".claude").join("settings.json"))
            }
        }
        _ => Err(format!("Invalid scope: {}", scope)),
    }
}

async fn read_json_file(path: &PathBuf) -> Option<serde_json::Value> {
    if !path.exists() {
        return None;
    }
    let content = tokio::fs::read_to_string(path).await.ok()?;
    serde_json::from_str(&content).ok()
}

fn read_cloud_connectors(claude_dir: &PathBuf) -> Vec<CloudMcpConnector> {
    let auth_cache_path = claude_dir.join("mcp-needs-auth-cache.json");
    let content = std::fs::read_to_string(&auth_cache_path).unwrap_or_default();
    let raw: HashMap<String, serde_json::Value> =
        serde_json::from_str(&content).unwrap_or_default();

    raw.keys()
        .map(|name| CloudMcpConnector {
            name: name.clone(),
            needs_auth: true,
        })
        .collect()
}

fn read_installed_plugins(
    claude_dir: &PathBuf,
    enabled_plugins: &HashMap<String, bool>,
) -> Vec<InstalledPlugin> {
    let plugins_path = claude_dir.join("plugins").join("installed_plugins.json");
    let content = std::fs::read_to_string(&plugins_path).unwrap_or_default();
    let raw: serde_json::Value = serde_json::from_str(&content).unwrap_or_default();

    let mut plugins = Vec::new();

    if let Some(obj) = raw.get("plugins").and_then(|v| v.as_object()) {
        for (full_name, installs) in obj {
            if let Some(arr) = installs.as_array() {
                for install in arr {
                    let scope = install
                        .get("scope")
                        .and_then(|v| v.as_str())
                        .unwrap_or("user")
                        .to_string();
                    let version = install
                        .get("version")
                        .and_then(|v| v.as_str())
                        .unwrap_or("unknown")
                        .to_string();
                    let install_path = install
                        .get("installPath")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string();
                    let project_path = install
                        .get("projectPath")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string());

                    // Split "plugin-name@marketplace" into parts
                    let parts: Vec<&str> = full_name.splitn(2, '@').collect();
                    let name = parts[0].to_string();
                    let marketplace = parts.get(1).unwrap_or(&"unknown").to_string();

                    let enabled = enabled_plugins.get(full_name).copied().unwrap_or(false);

                    plugins.push(InstalledPlugin {
                        name,
                        marketplace,
                        scope,
                        version,
                        install_path,
                        enabled,
                        project_path,
                    });
                }
            }
        }
    }

    plugins
}

fn parse_skill_frontmatter(content: &str) -> Option<(String, String)> {
    if !content.starts_with("---") {
        return None;
    }
    let end = content[3..].find("---")?;
    let frontmatter = &content[3..3 + end];

    let mut name = None;
    let mut description = None;

    for line in frontmatter.lines() {
        let line = line.trim();
        if let Some(val) = line.strip_prefix("name:") {
            name = Some(val.trim().trim_matches('"').to_string());
        } else if let Some(val) = line.strip_prefix("description:") {
            description = Some(val.trim().trim_matches('"').to_string());
        }
    }

    Some((name.unwrap_or_default(), description.unwrap_or_default()))
}

fn read_local_skills(installed_plugins: &[InstalledPlugin]) -> Vec<LocalSkill> {
    let mut skills = Vec::new();

    for plugin in installed_plugins {
        let skills_dir = PathBuf::from(&plugin.install_path).join("skills");
        if !skills_dir.exists() {
            continue;
        }

        let entries = match std::fs::read_dir(&skills_dir) {
            Ok(e) => e,
            Err(_) => continue,
        };

        for entry in entries.flatten() {
            let skill_md = entry.path().join("SKILL.md");
            if !skill_md.exists() {
                continue;
            }

            let content = match std::fs::read_to_string(&skill_md) {
                Ok(c) => c,
                Err(_) => continue,
            };

            if let Some((name, description)) = parse_skill_frontmatter(&content) {
                if name.is_empty() {
                    continue;
                }
                skills.push(LocalSkill {
                    name,
                    description,
                    plugin: format!("{}@{}", plugin.name, plugin.marketplace),
                    path: skill_md.to_string_lossy().to_string(),
                });
            }
        }
    }

    skills
}

fn read_local_agents(installed_plugins: &[InstalledPlugin]) -> Vec<LocalAgent> {
    let mut agents = Vec::new();

    for plugin in installed_plugins {
        let agents_dir = PathBuf::from(&plugin.install_path).join("agents");
        if !agents_dir.exists() {
            continue;
        }

        let entries = match std::fs::read_dir(&agents_dir) {
            Ok(e) => e,
            Err(_) => continue,
        };

        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) != Some("md") {
                continue;
            }

            let content = match std::fs::read_to_string(&path) {
                Ok(c) => c,
                Err(_) => continue,
            };

            if let Some((name, description)) = parse_skill_frontmatter(&content) {
                let agent_name = if name.is_empty() {
                    path.file_stem()
                        .unwrap_or_default()
                        .to_string_lossy()
                        .to_string()
                } else {
                    name
                };
                agents.push(LocalAgent {
                    name: agent_name,
                    description,
                    plugin: format!("{}@{}", plugin.name, plugin.marketplace),
                    path: path.to_string_lossy().to_string(),
                });
            }
        }
    }

    agents
}

fn read_custom_skills(claude_dir: &PathBuf) -> Vec<LocalSkill> {
    let mut skills = Vec::new();

    // Read ~/.claude/skills/*/SKILL.md
    let skills_dir = claude_dir.join("skills");
    if skills_dir.exists() {
        if let Ok(entries) = std::fs::read_dir(&skills_dir) {
            for entry in entries.flatten() {
                if !entry.path().is_dir() {
                    continue;
                }
                let skill_md = entry.path().join("SKILL.md");
                if !skill_md.exists() {
                    continue;
                }
                let content = match std::fs::read_to_string(&skill_md) {
                    Ok(c) => c,
                    Err(_) => continue,
                };
                if let Some((name, description)) = parse_skill_frontmatter(&content) {
                    let name = if name.is_empty() {
                        entry.file_name().to_string_lossy().to_string()
                    } else {
                        name
                    };
                    skills.push(LocalSkill {
                        name,
                        description,
                        plugin: "custom".to_string(),
                        path: skill_md.to_string_lossy().to_string(),
                    });
                }
            }
        }
    }

    // Read ~/.claude/commands/*.md
    let commands_dir = claude_dir.join("commands");
    if commands_dir.exists() {
        if let Ok(entries) = std::fs::read_dir(&commands_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().and_then(|e| e.to_str()) != Some("md") {
                    continue;
                }
                let content = match std::fs::read_to_string(&path) {
                    Ok(c) => c,
                    Err(_) => continue,
                };
                if let Some((name, description)) = parse_skill_frontmatter(&content) {
                    let cmd_name = if name.is_empty() {
                        path.file_stem()
                            .unwrap_or_default()
                            .to_string_lossy()
                            .to_string()
                    } else {
                        name
                    };
                    skills.push(LocalSkill {
                        name: cmd_name,
                        description,
                        plugin: "command".to_string(),
                        path: path.to_string_lossy().to_string(),
                    });
                }
            }
        }
    }

    skills
}

#[tauri::command]
fn read_custom_agents(claude_dir: &PathBuf) -> Vec<LocalAgent> {
    let agents_dir = claude_dir.join("agents");
    if !agents_dir.exists() {
        return Vec::new();
    }

    let mut agents = Vec::new();
    collect_agents_recursive(&agents_dir, &mut agents);
    agents
}

fn collect_agents_recursive(dir: &PathBuf, agents: &mut Vec<LocalAgent>) {
    let entries = match std::fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            collect_agents_recursive(&path, agents);
        } else if path.extension().and_then(|e| e.to_str()) == Some("md") {
            let content = match std::fs::read_to_string(&path) {
                Ok(c) => c,
                Err(_) => continue,
            };
            if let Some((name, description)) = parse_skill_frontmatter(&content) {
                let agent_name = if name.is_empty() {
                    path.file_stem()
                        .unwrap_or_default()
                        .to_string_lossy()
                        .to_string()
                } else {
                    name
                };
                agents.push(LocalAgent {
                    name: agent_name,
                    description,
                    plugin: "custom".to_string(),
                    path: path.to_string_lossy().to_string(),
                });
            }
        }
    }
}

fn read_recent_projects(claude_dir: &PathBuf) -> Vec<String> {
    let projects_dir = claude_dir.join("projects");
    if !projects_dir.exists() {
        return Vec::new();
    }

    let mut entries: Vec<_> = match std::fs::read_dir(&projects_dir) {
        Ok(e) => e.flatten().filter(|e| e.path().is_dir()).collect(),
        Err(_) => return Vec::new(),
    };

    // Sort by modification time (most recent first)
    entries.sort_by(|a, b| {
        let time_a = a.metadata().and_then(|m| m.modified()).unwrap_or(std::time::SystemTime::UNIX_EPOCH);
        let time_b = b.metadata().and_then(|m| m.modified()).unwrap_or(std::time::SystemTime::UNIX_EPOCH);
        time_b.cmp(&time_a)
    });

    let mut seen = std::collections::HashSet::new();
    let mut projects = Vec::new();

    for entry in entries.iter().take(30) {
        // Read cwd from the first jsonl session file
        if let Some(cwd) = extract_cwd_from_project_dir(&entry.path()) {
            if seen.insert(cwd.clone()) {
                projects.push(cwd);
                if projects.len() >= 15 {
                    break;
                }
            }
        }
    }

    projects
}

fn extract_cwd_from_project_dir(dir: &PathBuf) -> Option<String> {
    let entries = std::fs::read_dir(dir).ok()?;

    // Find the most recent .jsonl file
    let mut jsonl_files: Vec<_> = entries
        .flatten()
        .filter(|e| {
            e.path().extension().and_then(|x| x.to_str()) == Some("jsonl")
        })
        .collect();

    jsonl_files.sort_by(|a, b| {
        let ta = a.metadata().and_then(|m| m.modified()).unwrap_or(std::time::SystemTime::UNIX_EPOCH);
        let tb = b.metadata().and_then(|m| m.modified()).unwrap_or(std::time::SystemTime::UNIX_EPOCH);
        tb.cmp(&ta)
    });

    let jsonl = jsonl_files.first()?;

    // Read first few lines to find cwd
    let file = std::fs::File::open(jsonl.path()).ok()?;
    let reader = std::io::BufReader::new(file);
    use std::io::BufRead;

    for line in reader.lines().take(5).flatten() {
        if let Ok(val) = serde_json::from_str::<serde_json::Value>(&line) {
            if let Some(cwd) = val.get("cwd").and_then(|v| v.as_str()) {
                return Some(cwd.to_string());
            }
        }
    }

    None
}

#[tauri::command]
pub async fn read_config(
    scope: String,
    project_path: Option<String>,
) -> Result<ClaudeConfig, String> {
    let config_path = get_config_path(&scope, project_path.as_deref())?;

    if !config_path.exists() {
        return Ok(ClaudeConfig::default());
    }

    let content = tokio::fs::read_to_string(&config_path)
        .await
        .map_err(|e| format!("Failed to read {}: {}", config_path.display(), e))?;

    let raw: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse {}: {}", config_path.display(), e))?;

    let config = ClaudeConfig {
        mcp_servers: raw
            .get("mcpServers")
            .and_then(|v| serde_json::from_value(v.clone()).ok()),
        skills: raw
            .get("skills")
            .and_then(|v| serde_json::from_value(v.clone()).ok()),
        agents: raw
            .get("agents")
            .and_then(|v| serde_json::from_value(v.clone()).ok()),
    };

    Ok(config)
}

#[tauri::command]
pub async fn read_dashboard_data() -> Result<DashboardData, String> {
    let claude_dir = get_claude_dir()?;

    // Read global settings
    let settings_path = claude_dir.join("settings.json");
    let raw_settings = read_json_file(&settings_path).await;

    let config = if let Some(ref raw) = raw_settings {
        ClaudeConfig {
            mcp_servers: raw
                .get("mcpServers")
                .and_then(|v| serde_json::from_value(v.clone()).ok()),
            skills: raw
                .get("skills")
                .and_then(|v| serde_json::from_value(v.clone()).ok()),
            agents: raw
                .get("agents")
                .and_then(|v| serde_json::from_value(v.clone()).ok()),
        }
    } else {
        ClaudeConfig::default()
    };

    // Read enabled plugins from settings
    let enabled_plugins: HashMap<String, bool> = raw_settings
        .as_ref()
        .and_then(|raw| raw.get("enabledPlugins"))
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();

    // Read cloud connectors
    let cloud_connectors = read_cloud_connectors(&claude_dir);

    // Read installed plugins
    let installed_plugins = read_installed_plugins(&claude_dir, &enabled_plugins);

    // Read local skills from installed plugins + custom skills/commands
    let mut local_skills = read_local_skills(&installed_plugins);
    local_skills.extend(read_custom_skills(&claude_dir));

    let mut local_agents = read_local_agents(&installed_plugins);
    local_agents.extend(read_custom_agents(&claude_dir));


    // Read recent projects from ~/.claude/projects/
    let recent_projects = read_recent_projects(&claude_dir);

    Ok(DashboardData {
        config,
        cloud_connectors,
        installed_plugins,
        local_skills,
        local_agents,
        recent_projects,
    })
}

#[tauri::command]
pub async fn write_config(
    scope: String,
    project_path: Option<String>,
    config: ClaudeConfig,
) -> Result<(), String> {
    let config_path = get_config_path(&scope, project_path.as_deref())?;

    if let Some(parent) = config_path.parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|e| format!("Failed to create directory {}: {}", parent.display(), e))?;
    }

    let mut existing: serde_json::Value = if config_path.exists() {
        let content = tokio::fs::read_to_string(&config_path)
            .await
            .map_err(|e| format!("Failed to read existing config: {}", e))?;
        serde_json::from_str(&content).unwrap_or(serde_json::Value::Object(Default::default()))
    } else {
        serde_json::Value::Object(Default::default())
    };

    let obj = existing
        .as_object_mut()
        .ok_or("Config is not a JSON object")?;

    if let Some(ref servers) = config.mcp_servers {
        obj.insert(
            "mcpServers".to_string(),
            serde_json::to_value(servers).unwrap(),
        );
    } else {
        obj.remove("mcpServers");
    }

    if let Some(ref skills) = config.skills {
        obj.insert(
            "skills".to_string(),
            serde_json::to_value(skills).unwrap(),
        );
    } else {
        obj.remove("skills");
    }

    if let Some(ref agents) = config.agents {
        obj.insert(
            "agents".to_string(),
            serde_json::to_value(agents).unwrap(),
        );
    } else {
        obj.remove("agents");
    }

    if config_path.exists() {
        let backup_path = config_path.with_extension("json.bak");
        tokio::fs::copy(&config_path, &backup_path)
            .await
            .map_err(|e| format!("Failed to create backup: {}", e))?;
    }

    let content = serde_json::to_string_pretty(&existing)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;

    let temp_path = config_path.with_extension("json.tmp");
    tokio::fs::write(&temp_path, &content)
        .await
        .map_err(|e| format!("Failed to write temp file: {}", e))?;

    tokio::fs::rename(&temp_path, &config_path)
        .await
        .map_err(|e| format!("Failed to rename temp file: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn read_agent_file(path: String) -> Result<String, String> {
    tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| format!("Failed to read {}: {}", path, e))
}

#[tauri::command]
pub async fn write_agent_file(path: String, content: String) -> Result<(), String> {
    if let Some(parent) = std::path::Path::new(&path).parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|e| format!("Failed to create dir: {}", e))?;
    }
    tokio::fs::write(&path, &content)
        .await
        .map_err(|e| format!("Failed to write {}: {}", path, e))
}

#[tauri::command]
pub async fn delete_agent_file(path: String) -> Result<(), String> {
    tokio::fs::remove_file(&path)
        .await
        .map_err(|e| format!("Failed to delete {}: {}", path, e))
}

#[tauri::command]
pub async fn read_project_extras(
    project_path: String,
) -> Result<(Vec<LocalSkill>, Vec<LocalSkill>), String> {
    // Read project-local skills from {projectPath}/.claude/skills/
    let project_claude_dir = PathBuf::from(&project_path).join(".claude");
    let project_skills = read_custom_skills(&project_claude_dir);

    // Read project-local commands from {projectPath}/.claude/commands/
    // (read_custom_skills already reads both skills/ and commands/)

    Ok((project_skills, Vec::new()))
}

#[tauri::command]
pub async fn toggle_plugin(plugin_id: String, enabled: bool) -> Result<(), String> {
    let claude_dir = get_claude_dir()?;
    let settings_path = claude_dir.join("settings.json");

    let mut existing: serde_json::Value = if settings_path.exists() {
        let content = tokio::fs::read_to_string(&settings_path)
            .await
            .map_err(|e| format!("Failed to read settings: {}", e))?;
        serde_json::from_str(&content).unwrap_or(serde_json::Value::Object(Default::default()))
    } else {
        serde_json::Value::Object(Default::default())
    };

    let obj = existing.as_object_mut().ok_or("Settings is not a JSON object")?;

    let plugins = obj
        .entry("enabledPlugins")
        .or_insert_with(|| serde_json::Value::Object(Default::default()));

    if let Some(plugins_obj) = plugins.as_object_mut() {
        if enabled {
            plugins_obj.insert(plugin_id, serde_json::Value::Bool(true));
        } else {
            plugins_obj.remove(&plugin_id);
        }
    }

    // Backup
    if settings_path.exists() {
        let backup = settings_path.with_extension("json.bak");
        tokio::fs::copy(&settings_path, &backup).await.ok();
    }

    let content = serde_json::to_string_pretty(&existing)
        .map_err(|e| format!("Failed to serialize: {}", e))?;
    let temp = settings_path.with_extension("json.tmp");
    tokio::fs::write(&temp, &content).await.map_err(|e| format!("Write error: {}", e))?;
    tokio::fs::rename(&temp, &settings_path).await.map_err(|e| format!("Rename error: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn health_check_mcp() -> Result<Vec<(String, bool, String)>, String> {
    // Run claude with a quick check to see MCP status
    let output = std::process::Command::new("claude")
        .args(["--print", "--output-format", "stream-json", "--verbose", "--max-turns", "0"])
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn();

    let mut results = Vec::new();

    match output {
        Ok(mut child) => {
            // Send empty message and close stdin
            if let Some(mut stdin) = child.stdin.take() {
                let _ = std::io::Write::write_all(&mut stdin, b"health check\n");
                drop(stdin);
            }

            let output = child.wait_with_output()
                .map_err(|e| format!("Wait error: {}", e))?;

            let stdout = String::from_utf8_lossy(&output.stdout);

            // Parse the init event which contains mcp_servers status
            for line in stdout.lines() {
                if let Ok(val) = serde_json::from_str::<serde_json::Value>(line) {
                    if val.get("type").and_then(|t| t.as_str()) == Some("system")
                        && val.get("subtype").and_then(|t| t.as_str()) == Some("init")
                    {
                        if let Some(servers) = val.get("mcp_servers").and_then(|s| s.as_array()) {
                            for server in servers {
                                let name = server.get("name").and_then(|n| n.as_str()).unwrap_or("unknown").to_string();
                                let status = server.get("status").and_then(|s| s.as_str()).unwrap_or("unknown").to_string();
                                let connected = status == "connected";
                                results.push((name, connected, status));
                            }
                        }
                        break;
                    }
                }
            }
        }
        Err(e) => return Err(format!("Failed to start claude: {}", e)),
    }

    Ok(results)
}

pub async fn install_plugin(plugin_name: String) -> Result<String, String> {
    let output = tokio::process::Command::new("claude")
        .args(["mcp", "add", &plugin_name])
        .output()
        .await
        .map_err(|e| format!("Failed to run claude: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}
