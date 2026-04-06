use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportBundle {
    pub version: String,
    pub global_settings: Option<serde_json::Value>,
    pub agents: Vec<AgentFile>,
    pub skills: Vec<SkillFile>,
    pub commands: Vec<CommandFile>,
    pub dashboard_settings: Option<String>, // localStorage JSON
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AgentFile {
    pub path: String, // relative path from ~/.claude/agents/
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SkillFile {
    pub path: String,
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CommandFile {
    pub path: String,
    pub content: String,
}

fn claude_dir() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("Home dir not found")?;
    Ok(home.join(".claude"))
}

fn collect_files_recursive(dir: &PathBuf, base: &PathBuf) -> Vec<(String, String)> {
    let mut files = Vec::new();
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                files.extend(collect_files_recursive(&path, base));
            } else if path.extension().and_then(|e| e.to_str()) == Some("md") {
                if let Ok(content) = std::fs::read_to_string(&path) {
                    let rel = path.strip_prefix(base).unwrap_or(&path).to_string_lossy().to_string();
                    files.push((rel, content));
                }
            }
        }
    }
    files
}

#[tauri::command]
pub async fn export_config() -> Result<String, String> {
    let cdir = claude_dir()?;

    // Global settings
    let settings_path = cdir.join("settings.json");
    let global_settings = if settings_path.exists() {
        let content = std::fs::read_to_string(&settings_path)
            .map_err(|e| format!("Read error: {}", e))?;
        serde_json::from_str(&content).ok()
    } else {
        None
    };

    // Agents
    let agents_dir = cdir.join("agents");
    let agents: Vec<AgentFile> = collect_files_recursive(&agents_dir, &agents_dir)
        .into_iter()
        .map(|(path, content)| AgentFile { path, content })
        .collect();

    // Skills
    let skills_dir = cdir.join("skills");
    let skills: Vec<SkillFile> = if skills_dir.exists() {
        collect_files_recursive(&skills_dir, &skills_dir)
            .into_iter()
            .map(|(path, content)| SkillFile { path, content })
            .collect()
    } else {
        Vec::new()
    };

    // Commands
    let commands_dir = cdir.join("commands");
    let commands: Vec<CommandFile> = if commands_dir.exists() {
        collect_files_recursive(&commands_dir, &commands_dir)
            .into_iter()
            .map(|(path, content)| CommandFile { path, content })
            .collect()
    } else {
        Vec::new()
    };

    let bundle = ExportBundle {
        version: "1.2.0".to_string(),
        global_settings,
        agents,
        skills,
        commands,
        dashboard_settings: None, // Will be filled by frontend
    };

    serde_json::to_string_pretty(&bundle)
        .map_err(|e| format!("Serialize error: {}", e))
}

#[tauri::command]
pub async fn import_config(bundle_json: String) -> Result<String, String> {
    let bundle: ExportBundle = serde_json::from_str(&bundle_json)
        .map_err(|e| format!("Parse error: {}", e))?;

    let cdir = claude_dir()?;
    let mut imported = Vec::new();

    // Import global settings (merge, don't overwrite)
    if let Some(settings) = bundle.global_settings {
        let settings_path = cdir.join("settings.json");

        // Backup
        if settings_path.exists() {
            let backup = settings_path.with_extension("json.bak");
            let _ = std::fs::copy(&settings_path, &backup);
        }

        // Merge: keep existing keys, add new ones from import
        let mut existing: serde_json::Value = if settings_path.exists() {
            let content = std::fs::read_to_string(&settings_path).unwrap_or_default();
            serde_json::from_str(&content).unwrap_or(serde_json::Value::Object(Default::default()))
        } else {
            serde_json::Value::Object(Default::default())
        };

        if let (Some(exist_obj), Some(import_obj)) = (existing.as_object_mut(), settings.as_object()) {
            for (key, value) in import_obj {
                if !exist_obj.contains_key(key) {
                    exist_obj.insert(key.clone(), value.clone());
                }
            }
        }

        let content = serde_json::to_string_pretty(&existing)
            .map_err(|e| format!("Serialize error: {}", e))?;
        std::fs::write(&settings_path, &content)
            .map_err(|e| format!("Write error: {}", e))?;
        imported.push("settings.json".to_string());
    }

    // Import agents
    for agent in &bundle.agents {
        let path = cdir.join("agents").join(&agent.path);
        if let Some(parent) = path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        let _ = std::fs::write(&path, &agent.content);
        imported.push(format!("agents/{}", agent.path));
    }

    // Import skills
    for skill in &bundle.skills {
        let path = cdir.join("skills").join(&skill.path);
        if let Some(parent) = path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        let _ = std::fs::write(&path, &skill.content);
        imported.push(format!("skills/{}", skill.path));
    }

    // Import commands
    for cmd in &bundle.commands {
        let path = cdir.join("commands").join(&cmd.path);
        if let Some(parent) = path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        let _ = std::fs::write(&path, &cmd.content);
        imported.push(format!("commands/{}", cmd.path));
    }

    Ok(format!("Imported {} items: {}", imported.len(), imported.join(", ")))
}
