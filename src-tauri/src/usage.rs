pub use ccd_core::usage::UsageEntry;

#[tauri::command]
pub async fn read_usage_stats() -> Result<Vec<UsageEntry>, String> {
    ccd_core::usage::read_usage_stats().await
}
