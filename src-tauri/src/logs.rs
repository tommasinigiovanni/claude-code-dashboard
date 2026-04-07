pub use ccd_core::logs::LogEntry;

#[tauri::command]
pub async fn read_session_logs(
    project_path: Option<String>,
    max_entries: Option<usize>,
) -> Result<Vec<LogEntry>, String> {
    ccd_core::logs::read_session_logs(project_path, max_entries).await
}
