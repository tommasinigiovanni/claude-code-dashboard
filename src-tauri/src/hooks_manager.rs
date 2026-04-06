use crate::readers::get_claude_dir;

#[tauri::command]
pub async fn read_hooks() -> Result<serde_json::Value, String> {
    let claude_dir = get_claude_dir()?;
    let settings_path = claude_dir.join("settings.json");

    if !settings_path.exists() {
        return Ok(serde_json::Value::Object(Default::default()));
    }

    let content = tokio::fs::read_to_string(&settings_path)
        .await
        .map_err(|e| format!("Failed to read settings: {}", e))?;

    let raw: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse settings: {}", e))?;

    Ok(raw.get("hooks").cloned().unwrap_or(serde_json::Value::Object(Default::default())))
}

#[tauri::command]
pub async fn write_hooks(hooks: serde_json::Value) -> Result<(), String> {
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

    let obj = existing
        .as_object_mut()
        .ok_or("Settings is not a JSON object")?;

    obj.insert("hooks".to_string(), hooks);

    // Backup
    if settings_path.exists() {
        let backup = settings_path.with_extension("json.bak");
        tokio::fs::copy(&settings_path, &backup).await.ok();
    }

    let content = serde_json::to_string_pretty(&existing)
        .map_err(|e| format!("Failed to serialize: {}", e))?;
    let temp = settings_path.with_extension("json.tmp");
    tokio::fs::write(&temp, &content)
        .await
        .map_err(|e| format!("Write error: {}", e))?;
    tokio::fs::rename(&temp, &settings_path)
        .await
        .map_err(|e| format!("Rename error: {}", e))?;

    Ok(())
}
