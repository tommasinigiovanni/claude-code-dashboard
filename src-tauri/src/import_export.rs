#[tauri::command]
pub async fn export_config() -> Result<String, String> {
    ccd_core::import_export::export_config().await
}

#[tauri::command]
pub async fn import_config(bundle_json: String) -> Result<String, String> {
    ccd_core::import_export::import_config(bundle_json).await
}
