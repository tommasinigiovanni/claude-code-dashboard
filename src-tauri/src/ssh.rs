pub use ccd_core::ssh::SshConfig;
pub use ccd_core::ssh::get_ssh_command;

#[tauri::command]
pub async fn ssh_test_connection(config: SshConfig) -> Result<String, String> {
    ccd_core::ssh::ssh_test_connection(config).await
}

#[tauri::command]
pub async fn ssh_read_config(config: SshConfig, remote_path: String) -> Result<String, String> {
    ccd_core::ssh::ssh_read_config(config, remote_path).await
}

#[tauri::command]
pub async fn ssh_write_config(config: SshConfig, remote_path: String, content: String) -> Result<(), String> {
    ccd_core::ssh::ssh_write_config(config, remote_path, content).await
}

#[tauri::command]
pub async fn ssh_list_files(config: SshConfig, remote_dir: String, pattern: String) -> Result<Vec<String>, String> {
    ccd_core::ssh::ssh_list_files(config, remote_dir, pattern).await
}

#[tauri::command]
pub async fn ssh_read_dashboard_data(config: SshConfig) -> Result<serde_json::Value, String> {
    ccd_core::ssh::ssh_read_dashboard_data(config).await
}

#[tauri::command]
pub async fn ssh_health_check_mcp(config: SshConfig) -> Result<Vec<(String, bool, String)>, String> {
    ccd_core::ssh::ssh_health_check_mcp(config).await
}

#[tauri::command]
pub async fn ssh_tmux_list_sessions(config: SshConfig) -> Result<Vec<(String, bool, u32, String)>, String> {
    ccd_core::ssh::ssh_tmux_list_sessions(config).await
}

#[tauri::command]
pub async fn ssh_tmux_kill_session(config: SshConfig, session_name: String) -> Result<(), String> {
    ccd_core::ssh::ssh_tmux_kill_session(config, session_name).await
}

#[tauri::command]
pub async fn ssh_list_dirs(config: SshConfig, base_path: String) -> Result<Vec<String>, String> {
    ccd_core::ssh::ssh_list_dirs(config, base_path).await
}
