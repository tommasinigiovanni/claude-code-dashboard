pub use ccd_core::backup::BackupInfo;

#[tauri::command]
pub async fn auto_backup() -> Result<String, String> {
    ccd_core::backup::auto_backup().await
}

#[tauri::command]
pub async fn list_backups() -> Result<Vec<BackupInfo>, String> {
    ccd_core::backup::list_backups().await
}

#[tauri::command]
pub async fn restore_backup(filename: String) -> Result<(), String> {
    ccd_core::backup::restore_backup(filename).await
}

#[tauri::command]
pub async fn delete_backup(filename: String) -> Result<(), String> {
    ccd_core::backup::delete_backup(filename).await
}
