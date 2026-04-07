use tauri::{AppHandle, Emitter};
use ccd_core::events::EventEmitter;

pub use ccd_core::chat::ChatEvent;

struct TauriEmitter(AppHandle);

impl EventEmitter for TauriEmitter {
    fn emit(&self, event_name: &str, payload: String) {
        // Try to deserialize as ChatEvent for structured Tauri emit
        if let Ok(chat_event) = serde_json::from_str::<ChatEvent>(&payload) {
            let _ = self.0.emit(event_name, chat_event);
        } else {
            let _ = self.0.emit(event_name, payload);
        }
    }
}

#[tauri::command]
pub async fn chat_start(
    app: AppHandle,
    project_path: Option<String>,
    ssh_config: Option<ccd_core::ssh::SshConfig>,
) -> Result<String, String> {
    let emitter = TauriEmitter(app);
    ccd_core::chat::chat_start(emitter, project_path, ssh_config).await
}

#[tauri::command]
pub async fn chat_send(session_id: String, message: String) -> Result<(), String> {
    ccd_core::chat::chat_send(session_id, message).await
}

#[tauri::command]
pub async fn chat_approve(session_id: String, approved: bool) -> Result<(), String> {
    ccd_core::chat::chat_approve(session_id, approved).await
}

#[tauri::command]
pub async fn save_temp_image(data: Vec<u8>, extension: String) -> Result<String, String> {
    ccd_core::chat::save_temp_image(data, extension).await
}
