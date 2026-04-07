pub use ccd_core::types::{ClaudeConfig, DashboardData, LocalSkill};

#[tauri::command]
pub async fn read_config(
    scope: String,
    project_path: Option<String>,
) -> Result<ClaudeConfig, String> {
    ccd_core::config::read_config(scope, project_path).await
}

#[tauri::command]
pub async fn read_dashboard_data() -> Result<DashboardData, String> {
    ccd_core::config::read_dashboard_data().await
}

#[tauri::command]
pub async fn write_config(
    scope: String,
    project_path: Option<String>,
    config: ClaudeConfig,
) -> Result<(), String> {
    ccd_core::config::write_config(scope, project_path, config).await
}

#[tauri::command]
pub async fn get_claude_home() -> Result<String, String> {
    ccd_core::config::get_claude_home().await
}

#[tauri::command]
pub async fn read_agent_file(path: String) -> Result<String, String> {
    ccd_core::config::read_agent_file(path).await
}

#[tauri::command]
pub async fn write_agent_file(path: String, content: String) -> Result<(), String> {
    ccd_core::config::write_agent_file(path, content).await
}

#[tauri::command]
pub async fn delete_agent_file(path: String) -> Result<(), String> {
    ccd_core::config::delete_agent_file(path).await
}

#[tauri::command]
pub async fn read_project_extras(
    project_path: String,
) -> Result<(Vec<LocalSkill>, Vec<LocalSkill>), String> {
    ccd_core::config::read_project_extras(project_path).await
}

#[tauri::command]
pub async fn toggle_plugin(plugin_id: String, enabled: bool) -> Result<(), String> {
    ccd_core::config::toggle_plugin(plugin_id, enabled).await
}

#[tauri::command]
pub async fn health_check_mcp() -> Result<Vec<(String, bool, String)>, String> {
    ccd_core::config::health_check_mcp().await
}
