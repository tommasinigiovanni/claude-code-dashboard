use tauri_plugin_dialog::DialogExt;

#[tauri::command]
pub async fn pick_directory(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let handle = app.clone();

    let result = tokio::task::spawn_blocking(move || {
        handle.dialog()
            .file()
            .blocking_pick_folder()
            .map(|f| f.to_string())
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?;

    Ok(result)
}
