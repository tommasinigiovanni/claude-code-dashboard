pub use ccd_core::learning::MemoryFile;

#[tauri::command]
pub async fn read_memories(
    project_path: Option<String>,
) -> Result<Vec<MemoryFile>, String> {
    ccd_core::learning::read_memories(project_path).await
}
