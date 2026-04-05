use serde::{Deserialize, Serialize};
use std::process::{Command, Stdio};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SshConfig {
    pub name: String,
    pub host: String,
    pub port: u16,
    pub user: String,
    pub key_path: Option<String>,  // path to SSH key, None = use default
}

fn build_ssh_args(config: &SshConfig) -> Vec<String> {
    let mut args = vec![
        "-o".to_string(), "StrictHostKeyChecking=no".to_string(),
        "-o".to_string(), "ConnectTimeout=10".to_string(),
        "-p".to_string(), config.port.to_string(),
    ];
    if let Some(ref key) = config.key_path {
        args.push("-i".to_string());
        args.push(key.clone());
    }
    args.push(format!("{}@{}", config.user, config.host));
    args
}

#[tauri::command]
pub async fn ssh_test_connection(config: SshConfig) -> Result<String, String> {
    let mut args = build_ssh_args(&config);
    args.push("echo 'SSH_OK' && claude --version 2>/dev/null || echo 'CLAUDE_NOT_FOUND'".to_string());

    let output = Command::new("ssh")
        .args(&args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| format!("SSH error: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("SSH connection failed: {}", stderr.trim()));
    }

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if stdout.contains("SSH_OK") {
        if stdout.contains("CLAUDE_NOT_FOUND") {
            Ok("connected_no_claude".to_string())
        } else {
            Ok(format!("connected:{}", stdout.lines().last().unwrap_or("unknown")))
        }
    } else {
        Err("SSH connection failed".to_string())
    }
}

#[tauri::command]
pub async fn ssh_read_config(config: SshConfig, remote_path: String) -> Result<String, String> {
    let mut args = build_ssh_args(&config);
    args.push(format!("cat '{}' 2>/dev/null || echo '{{}}'", remote_path));

    let output = Command::new("ssh")
        .args(&args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| format!("SSH error: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        Err(format!("SSH read error: {}", String::from_utf8_lossy(&output.stderr)))
    }
}

#[tauri::command]
pub async fn ssh_write_config(config: SshConfig, remote_path: String, content: String) -> Result<(), String> {
    let mut args = build_ssh_args(&config);
    // Backup + write via heredoc
    let cmd = format!(
        "mkdir -p $(dirname '{}') && cp '{}' '{}.bak' 2>/dev/null; cat > '{}'",
        remote_path, remote_path, remote_path, remote_path
    );
    args.push(cmd);

    let mut child = Command::new("ssh")
        .args(&args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("SSH error: {}", e))?;

    if let Some(mut stdin) = child.stdin.take() {
        use std::io::Write;
        stdin.write_all(content.as_bytes()).map_err(|e| format!("Write error: {}", e))?;
        drop(stdin);
    }

    let output = child.wait_with_output().map_err(|e| format!("Wait error: {}", e))?;
    if output.status.success() {
        Ok(())
    } else {
        Err(format!("SSH write error: {}", String::from_utf8_lossy(&output.stderr)))
    }
}

#[tauri::command]
pub async fn ssh_list_files(config: SshConfig, remote_dir: String, pattern: String) -> Result<Vec<String>, String> {
    let mut args = build_ssh_args(&config);
    args.push(format!("find '{}' -name '{}' -type f 2>/dev/null", remote_dir, pattern));

    let output = Command::new("ssh")
        .args(&args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| format!("SSH error: {}", e))?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        Ok(stdout.lines().filter(|l| !l.is_empty()).map(|l| l.to_string()).collect())
    } else {
        Ok(Vec::new())
    }
}

#[tauri::command]
pub async fn ssh_read_dashboard_data(config: SshConfig) -> Result<serde_json::Value, String> {
    // Read everything we need in a single SSH command
    let mut args = build_ssh_args(&config);
    args.push(r#"
cat ~/.claude/settings.json 2>/dev/null || echo '{}';
echo '___SEPARATOR___';
cat ~/.claude/plugins/installed_plugins.json 2>/dev/null || echo '{"plugins":{}}';
echo '___SEPARATOR___';
cat ~/.claude/mcp-needs-auth-cache.json 2>/dev/null || echo '{}';
echo '___SEPARATOR___';
find ~/.claude/agents -name '*.md' -exec echo '{}' \; 2>/dev/null;
echo '___SEPARATOR___';
find ~/.claude/skills -name 'SKILL.md' -exec echo '{}' \; 2>/dev/null;
echo '___SEPARATOR___';
find ~/.claude/commands -name '*.md' -exec echo '{}' \; 2>/dev/null;
echo '___SEPARATOR___';
for d in $(ls -1t ~/.claude/projects/ 2>/dev/null | head -15); do f=$(ls -1t ~/.claude/projects/$d/*.jsonl 2>/dev/null | head -1); if [ -n "$f" ]; then grep -m1 '"cwd"' "$f" 2>/dev/null | sed 's/.*"cwd":"\([^"]*\)".*/\1/'; fi; done;
echo '___SEPARATOR___';
tmux list-sessions -F '#{session_name}|#{session_attached}|#{session_windows}|#{session_created_string}' 2>/dev/null || echo '';
"#.to_string());

    let output = Command::new("ssh")
        .args(&args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| format!("SSH error: {}", e))?;

    if !output.status.success() {
        return Err(format!("SSH error: {}", String::from_utf8_lossy(&output.stderr)));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let parts: Vec<&str> = stdout.split("___SEPARATOR___").collect();

    // Parse settings
    let settings: serde_json::Value = parts.first()
        .and_then(|s| serde_json::from_str(s.trim()).ok())
        .unwrap_or(serde_json::Value::Object(Default::default()));

    // Parse installed plugins
    let installed_plugins_raw: serde_json::Value = parts.get(1)
        .and_then(|s| serde_json::from_str(s.trim()).ok())
        .unwrap_or(serde_json::Value::Object(Default::default()));

    // Parse enabled plugins from settings
    let enabled_plugins = settings.get("enabledPlugins")
        .and_then(|v| v.as_object())
        .cloned()
        .unwrap_or_default();

    let mut plugins = Vec::new();
    if let Some(obj) = installed_plugins_raw.get("plugins").and_then(|v| v.as_object()) {
        for (full_name, installs) in obj {
            if let Some(arr) = installs.as_array() {
                for install in arr {
                    let scope = install.get("scope").and_then(|v| v.as_str()).unwrap_or("user");
                    let version = install.get("version").and_then(|v| v.as_str()).unwrap_or("unknown");
                    let install_path = install.get("installPath").and_then(|v| v.as_str()).unwrap_or("");
                    let name_parts: Vec<&str> = full_name.splitn(2, '@').collect();
                    let name = name_parts[0];
                    let marketplace = name_parts.get(1).unwrap_or(&"unknown");
                    let enabled = enabled_plugins.get(full_name)
                        .and_then(|v| v.as_bool())
                        .unwrap_or(false);

                    plugins.push(serde_json::json!({
                        "name": name,
                        "marketplace": marketplace,
                        "scope": scope,
                        "version": version,
                        "installPath": install_path,
                        "enabled": enabled,
                    }));
                }
            }
        }
    }

    // Parse cloud connectors
    let cloud_raw: serde_json::Value = parts.get(2)
        .and_then(|s| serde_json::from_str(s.trim()).ok())
        .unwrap_or(serde_json::Value::Object(Default::default()));
    let cloud_connectors: Vec<serde_json::Value> = cloud_raw.as_object()
        .map(|obj| obj.keys().map(|k| serde_json::json!({"name": k, "needsAuth": true})).collect())
        .unwrap_or_default();

    // Parse agents
    let agents: Vec<serde_json::Value> = parts.get(3)
        .map(|s| s.trim().lines()
            .filter(|l| !l.is_empty())
            .map(|path| {
                let name = std::path::Path::new(path)
                    .file_stem()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string();
                serde_json::json!({"name": name, "description": "", "plugin": "custom", "path": path})
            })
            .collect())
        .unwrap_or_default();

    // Parse skills
    let skills: Vec<serde_json::Value> = parts.get(4)
        .map(|s| s.trim().lines()
            .filter(|l| !l.is_empty())
            .map(|path| {
                let dir_name = std::path::Path::new(path)
                    .parent()
                    .and_then(|p| p.file_name())
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string();
                serde_json::json!({"name": dir_name, "description": "", "plugin": "custom", "path": path})
            })
            .collect())
        .unwrap_or_default();

    // Parse commands
    let commands: Vec<serde_json::Value> = parts.get(5)
        .map(|s| s.trim().lines()
            .filter(|l| !l.is_empty())
            .map(|path| {
                let name = std::path::Path::new(path)
                    .file_stem()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string();
                serde_json::json!({"name": name, "description": "", "plugin": "command", "path": path})
            })
            .collect())
        .unwrap_or_default();

    // Parse recent projects
    let recent_projects: Vec<String> = parts.get(6)
        .map(|s| s.trim().lines()
            .filter(|l| !l.is_empty())
            .map(|l| l.to_string())
            .collect())
        .unwrap_or_default();

    // Parse tmux sessions
    let tmux_sessions: Vec<serde_json::Value> = parts.get(7)
        .map(|s| s.trim().lines()
            .filter(|l| !l.is_empty() && l.contains('|'))
            .filter_map(|line| {
                let p: Vec<&str> = line.splitn(4, '|').collect();
                if p.len() >= 4 {
                    Some(serde_json::json!({
                        "name": p[0],
                        "attached": p[1] == "1",
                        "windows": p[2].parse::<u32>().unwrap_or(1),
                        "created": p[3],
                    }))
                } else { None }
            })
            .collect())
        .unwrap_or_default();

    // Combine all skills + commands
    let mut all_skills = skills;
    all_skills.extend(commands);

    Ok(serde_json::json!({
        "config": {
            "mcpServers": settings.get("mcpServers"),
            "skills": settings.get("skills"),
            "agents": settings.get("agents"),
        },
        "cloudConnectors": cloud_connectors,
        "installedPlugins": plugins,
        "localSkills": all_skills,
        "localAgents": agents,
        "recentProjects": recent_projects,
        "tmuxSessions": tmux_sessions,
    }))
}

#[tauri::command]
pub async fn ssh_health_check_mcp(config: SshConfig) -> Result<Vec<(String, bool, String)>, String> {
    let mut args = build_ssh_args(&config);
    // Run claude --print on remote, read init event for MCP status
    args.push("echo 'ok' | claude --print --output-format stream-json --verbose 2>&1 | head -100".to_string());

    let output = Command::new("ssh")
        .args(&args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| format!("SSH error: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut results = Vec::new();

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

    Ok(results)
}

#[tauri::command]
pub async fn ssh_tmux_list_sessions(config: SshConfig) -> Result<Vec<(String, bool, u32, String)>, String> {
    let mut args = build_ssh_args(&config);
    args.push("tmux list-sessions -F '#{session_name}|#{session_attached}|#{session_windows}|#{session_created_string}' 2>/dev/null || echo ''".to_string());

    let output = Command::new("ssh")
        .args(&args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| format!("SSH error: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let sessions: Vec<(String, bool, u32, String)> = stdout.lines()
        .filter(|l| !l.is_empty() && l.contains('|'))
        .filter_map(|line| {
            let parts: Vec<&str> = line.splitn(4, '|').collect();
            if parts.len() >= 4 {
                Some((
                    parts[0].to_string(),
                    parts[1] == "1",
                    parts[2].parse().unwrap_or(1),
                    parts[3].to_string(),
                ))
            } else { None }
        })
        .collect();

    Ok(sessions)
}

#[tauri::command]
pub async fn ssh_list_dirs(config: SshConfig, base_path: String) -> Result<Vec<String>, String> {
    let mut args = build_ssh_args(&config);
    args.push(format!(
        "find '{}' -maxdepth 2 -type d -name '.git' 2>/dev/null | sed 's/\\.git$//' | head -20",
        base_path
    ));

    let output = Command::new("ssh")
        .args(&args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| format!("SSH error: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(stdout.lines().filter(|l| !l.is_empty()).map(|l| l.to_string()).collect())
}

/// Returns the SSH command string for use in PTY (terminal/chat)
pub fn get_ssh_command(config: &SshConfig) -> String {
    let mut parts = vec!["ssh".to_string()];
    parts.push("-o".to_string());
    parts.push("StrictHostKeyChecking=no".to_string());
    parts.push("-p".to_string());
    parts.push(config.port.to_string());
    if let Some(ref key) = config.key_path {
        parts.push("-i".to_string());
        parts.push(key.clone());
    }
    parts.push("-t".to_string()); // Force TTY for interactive use
    parts.push(format!("{}@{}", config.user, config.host));
    parts.join(" ")
}
