use std::collections::HashMap;
use std::path::PathBuf;

use crate::types::*;

pub fn get_claude_dir() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("Home directory not found")?;
    Ok(home.join(".claude"))
}

pub fn get_config_path(scope: &str, project_path: Option<&str>) -> Result<PathBuf, String> {
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

pub async fn read_json_file(path: &PathBuf) -> Option<serde_json::Value> {
    if !path.exists() {
        return None;
    }
    let content = tokio::fs::read_to_string(path).await.ok()?;
    serde_json::from_str(&content).ok()
}

pub fn read_cloud_connectors(claude_dir: &PathBuf) -> Vec<CloudMcpConnector> {
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

pub fn read_installed_plugins(
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

pub fn parse_skill_frontmatter(content: &str) -> Option<(String, String)> {
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

pub fn read_local_skills(installed_plugins: &[InstalledPlugin]) -> Vec<LocalSkill> {
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

pub fn read_local_agents(installed_plugins: &[InstalledPlugin]) -> Vec<LocalAgent> {
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

pub fn read_custom_skills(claude_dir: &PathBuf) -> Vec<LocalSkill> {
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

pub fn read_custom_agents(claude_dir: &PathBuf) -> Vec<LocalAgent> {
    let agents_dir = claude_dir.join("agents");
    if !agents_dir.exists() {
        return Vec::new();
    }

    let mut agents = Vec::new();
    collect_agents_recursive(&agents_dir, &mut agents);
    agents
}

pub fn collect_agents_recursive(dir: &PathBuf, agents: &mut Vec<LocalAgent>) {
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

pub fn read_recent_projects(claude_dir: &PathBuf) -> Vec<String> {
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

pub fn extract_cwd_from_project_dir(dir: &PathBuf) -> Option<String> {
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
