use std::collections::HashMap;
use std::path::PathBuf;

use crate::types::*;
use crate::readers::*;

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

    // Only update fields that are explicitly set (Some), leave others unchanged
    if let Some(ref servers) = config.mcp_servers {
        obj.insert(
            "mcpServers".to_string(),
            serde_json::to_value(servers).unwrap(),
        );
    }
    // Don't remove mcpServers when None — it means "no change"

    if let Some(ref skills) = config.skills {
        obj.insert(
            "skills".to_string(),
            serde_json::to_value(skills).unwrap(),
        );
    }

    if let Some(ref agents) = config.agents {
        obj.insert(
            "agents".to_string(),
            serde_json::to_value(agents).unwrap(),
        );
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
pub async fn get_claude_home() -> Result<String, String> {
    let claude_dir = get_claude_dir()?;
    Ok(claude_dir.to_string_lossy().to_string())
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
    use std::io::BufRead;

    // Run claude -p with a simple prompt, parse the init event for MCP status
    let mut child = std::process::Command::new(&crate::launcher::find_claude_path())
        .args(["--print", "--output-format", "stream-json", "--verbose"])
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to start claude: {}", e))?;

    // Send a minimal message and close stdin immediately
    if let Some(mut stdin) = child.stdin.take() {
        let _ = std::io::Write::write_all(&mut stdin, b"ok\n");
        drop(stdin);
    }

    let stdout = child.stdout.take().ok_or("No stdout")?;
    let reader = std::io::BufReader::new(stdout);
    let mut results = Vec::new();

    // Read lines until we find the init event (has mcp_servers)
    for line in reader.lines().take(50).flatten() {
        if let Ok(val) = serde_json::from_str::<serde_json::Value>(&line) {
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
                // Kill the process, we got what we need
                let _ = child.kill();
                break;
            }
        }
    }

    let _ = child.wait();
    Ok(results)
}
