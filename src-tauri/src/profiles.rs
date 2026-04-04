use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Profile {
    pub name: String,
    pub description: String,
    pub config: serde_json::Value, // snapshot of settings.json relevant parts
    pub created_at: String,
}

fn profiles_dir() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("Home dir not found")?;
    let dir = home.join(".claude").join("dashboard-profiles");
    std::fs::create_dir_all(&dir).map_err(|e| format!("Create dir error: {}", e))?;
    Ok(dir)
}

#[tauri::command]
pub async fn list_profiles() -> Result<Vec<Profile>, String> {
    let dir = profiles_dir()?;
    let mut profiles = Vec::new();

    if let Ok(entries) = std::fs::read_dir(&dir) {
        for entry in entries.flatten() {
            if entry.path().extension().and_then(|e| e.to_str()) == Some("json") {
                if let Ok(content) = std::fs::read_to_string(entry.path()) {
                    if let Ok(profile) = serde_json::from_str::<Profile>(&content) {
                        profiles.push(profile);
                    }
                }
            }
        }
    }

    profiles.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(profiles)
}

#[tauri::command]
pub async fn save_profile(name: String, description: String) -> Result<(), String> {
    let dir = profiles_dir()?;

    // Read current global settings
    let home = dirs::home_dir().ok_or("Home dir not found")?;
    let settings_path = home.join(".claude").join("settings.json");
    let config: serde_json::Value = if settings_path.exists() {
        let content = std::fs::read_to_string(&settings_path)
            .map_err(|e| format!("Read error: {}", e))?;
        serde_json::from_str(&content).unwrap_or(serde_json::Value::Object(Default::default()))
    } else {
        serde_json::Value::Object(Default::default())
    };

    let profile = Profile {
        name: name.clone(),
        description,
        config,
        created_at: chrono_now(),
    };

    let filename = format!("{}.json", sanitize_filename(&name));
    let path = dir.join(&filename);
    let content = serde_json::to_string_pretty(&profile)
        .map_err(|e| format!("Serialize error: {}", e))?;
    std::fs::write(&path, &content).map_err(|e| format!("Write error: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn load_profile(name: String) -> Result<(), String> {
    let dir = profiles_dir()?;
    let filename = format!("{}.json", sanitize_filename(&name));
    let path = dir.join(&filename);

    let content = std::fs::read_to_string(&path)
        .map_err(|e| format!("Read error: {}", e))?;
    let profile: Profile = serde_json::from_str(&content)
        .map_err(|e| format!("Parse error: {}", e))?;

    // Write profile config to global settings
    let home = dirs::home_dir().ok_or("Home dir not found")?;
    let settings_path = home.join(".claude").join("settings.json");

    // Backup current
    if settings_path.exists() {
        let backup = settings_path.with_extension("json.bak");
        let _ = std::fs::copy(&settings_path, &backup);
    }

    let content = serde_json::to_string_pretty(&profile.config)
        .map_err(|e| format!("Serialize error: {}", e))?;
    std::fs::write(&settings_path, &content)
        .map_err(|e| format!("Write error: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn delete_profile(name: String) -> Result<(), String> {
    let dir = profiles_dir()?;
    let filename = format!("{}.json", sanitize_filename(&name));
    let path = dir.join(&filename);
    std::fs::remove_file(&path).map_err(|e| format!("Delete error: {}", e))?;
    Ok(())
}

fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '_' })
        .collect()
}

fn chrono_now() -> String {
    // Simple ISO timestamp without chrono crate
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    format!("{}", now.as_secs())
}
