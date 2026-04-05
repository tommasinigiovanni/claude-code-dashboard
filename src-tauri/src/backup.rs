#[tauri::command]
pub async fn auto_backup() -> Result<String, String> {
    let home = dirs::home_dir().ok_or("Home not found")?;
    let backup_dir = home.join(".claude").join("dashboard-backups");
    std::fs::create_dir_all(&backup_dir).map_err(|e| format!("{}", e))?;

    // Read current settings
    let settings_path = home.join(".claude").join("settings.json");
    if !settings_path.exists() {
        return Ok("No settings to backup".to_string());
    }

    let content = std::fs::read_to_string(&settings_path).map_err(|e| format!("{}", e))?;

    // Save with date
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    let filename = format!("backup-{}.json", now.as_secs());
    std::fs::write(backup_dir.join(&filename), &content).map_err(|e| format!("{}", e))?;

    // Keep only last 7 backups
    let mut entries: Vec<_> = std::fs::read_dir(&backup_dir)
        .map_err(|e| format!("{}", e))?
        .flatten()
        .filter(|e| {
            e.path()
                .extension()
                .map(|x| x == "json")
                .unwrap_or(false)
        })
        .collect();
    entries.sort_by(|a, b| b.file_name().cmp(&a.file_name()));
    for old in entries.iter().skip(7) {
        let _ = std::fs::remove_file(old.path());
    }

    Ok(filename)
}
