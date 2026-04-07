use tauri::{AppHandle, Emitter};
use ccd_core::events::EventEmitter;

pub use ccd_core::terminal::TmuxSession;

struct TauriEmitter(AppHandle);

impl EventEmitter for TauriEmitter {
    fn emit(&self, event_name: &str, payload: String) {
        let _ = self.0.emit(event_name, payload.clone());
    }
}

#[tauri::command]
pub async fn terminal_spawn(
    app: AppHandle,
    project_path: Option<String>,
    use_tmux: Option<bool>,
    tmux_attach_session: Option<String>,
    ssh_config: Option<ccd_core::ssh::SshConfig>,
) -> Result<String, String> {
    let emitter = TauriEmitter(app);
    ccd_core::terminal::terminal_spawn(emitter, project_path, use_tmux, tmux_attach_session, ssh_config).await
}

#[tauri::command]
pub async fn terminal_write(session_id: String, data: String) -> Result<(), String> {
    ccd_core::terminal::terminal_write(session_id, data).await
}

#[tauri::command]
pub async fn terminal_resize(session_id: String, rows: u16, cols: u16) -> Result<(), String> {
    ccd_core::terminal::terminal_resize(session_id, rows, cols).await
}

#[tauri::command]
pub async fn tmux_list_sessions() -> Result<Vec<TmuxSession>, String> {
    ccd_core::terminal::tmux_list_sessions().await
}

#[tauri::command]
pub async fn tmux_session_cwd(session_name: String) -> Result<Option<String>, String> {
    ccd_core::terminal::tmux_session_cwd(session_name).await
}

#[tauri::command]
pub async fn tmux_kill_session(session_name: String) -> Result<(), String> {
    ccd_core::terminal::tmux_kill_session(session_name).await
}
