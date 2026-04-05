use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BackupInfo {
    pub filename: String,
    pub timestamp: u64,
    pub size_bytes: u64,
}

#[tauri::command]
pub async fn auto_backup() -> Result<String, String> {
    let home = dirs::home_dir().ok_or("Home not found")?;
    let backup_dir = home.join(".claude").join("dashboard-backups");
    std::fs::create_dir_all(&backup_dir).map_err(|e| format!("{}", e))?;

    let settings_path = home.join(".claude").join("settings.json");
    if !settings_path.exists() {
        return Ok("No settings to backup".to_string());
    }

    let content = std::fs::read_to_string(&settings_path).map_err(|e| format!("{}", e))?;

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    let filename = format!("backup-{}.json", now.as_secs());
    std::fs::write(backup_dir.join(&filename), &content).map_err(|e| format!("{}", e))?;

    // Keep only last 7
    let mut entries: Vec<_> = std::fs::read_dir(&backup_dir)
        .map_err(|e| format!("{}", e))?
        .flatten()
        .filter(|e| e.path().extension().map(|x| x == "json").unwrap_or(false))
        .collect();
    entries.sort_by(|a, b| b.file_name().cmp(&a.file_name()));
    for old in entries.iter().skip(7) {
        let _ = std::fs::remove_file(old.path());
    }

    Ok(filename)
}

#[tauri::command]
pub async fn list_backups() -> Result<Vec<BackupInfo>, String> {
    let home = dirs::home_dir().ok_or("Home not found")?;
    let backup_dir = home.join(".claude").join("dashboard-backups");
    if !backup_dir.exists() {
        return Ok(Vec::new());
    }

    let mut backups: Vec<BackupInfo> = std::fs::read_dir(&backup_dir)
        .map_err(|e| format!("{}", e))?
        .flatten()
        .filter(|e| e.path().extension().map(|x| x == "json").unwrap_or(false))
        .filter_map(|e| {
            let filename = e.file_name().to_string_lossy().to_string();
            let ts: u64 = filename
                .strip_prefix("backup-")?
                .strip_suffix(".json")?
                .parse()
                .ok()?;
            let size = e.metadata().ok()?.len();
            Some(BackupInfo {
                filename,
                timestamp: ts,
                size_bytes: size,
            })
        })
        .collect();

    backups.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    Ok(backups)
}

#[tauri::command]
pub async fn restore_backup(filename: String) -> Result<(), String> {
    let home = dirs::home_dir().ok_or("Home not found")?;
    let backup_dir = home.join(".claude").join("dashboard-backups");
    let backup_path = backup_dir.join(&filename);

    if !backup_path.exists() {
        return Err("Backup not found".to_string());
    }

    let content = std::fs::read_to_string(&backup_path).map_err(|e| format!("{}", e))?;

    // Backup current before restoring
    let settings_path = home.join(".claude").join("settings.json");
    if settings_path.exists() {
        let current = std::fs::read_to_string(&settings_path).unwrap_or_default();
        let pre_restore = backup_dir.join("pre-restore.json");
        let _ = std::fs::write(&pre_restore, &current);
    }

    std::fs::write(&settings_path, &content).map_err(|e| format!("{}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn delete_backup(filename: String) -> Result<(), String> {
    let home = dirs::home_dir().ok_or("Home not found")?;
    let path = home.join(".claude").join("dashboard-backups").join(&filename);
    std::fs::remove_file(&path).map_err(|e| format!("{}", e))?;
    Ok(())
}
