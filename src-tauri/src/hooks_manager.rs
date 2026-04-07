#[tauri::command]
pub async fn read_hooks() -> Result<serde_json::Value, String> {
    ccd_core::hooks::read_hooks().await
}

#[tauri::command]
pub async fn write_hooks(hooks: serde_json::Value) -> Result<(), String> {
    ccd_core::hooks::write_hooks(hooks).await
}
