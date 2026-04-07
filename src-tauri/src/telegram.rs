use tauri::{AppHandle, Emitter};
use ccd_core::events::EventEmitter;

pub use ccd_core::telegram::TelegramBotStatus;

struct TauriEmitter(AppHandle);

impl EventEmitter for TauriEmitter {
    fn emit(&self, event_name: &str, payload: String) {
        if let Ok(status) = serde_json::from_str::<TelegramBotStatus>(&payload) {
            let _ = self.0.emit(event_name, status);
        } else {
            let _ = self.0.emit(event_name, payload);
        }
    }
}

#[tauri::command]
pub async fn telegram_start_bot(
    app: AppHandle,
    bot_token: String,
    allowed_chat_id: Option<i64>,
    project_path: Option<String>,
    auto_approve: Option<bool>,
) -> Result<TelegramBotStatus, String> {
    let emitter = TauriEmitter(app);
    ccd_core::telegram::telegram_start_bot(emitter, bot_token, allowed_chat_id, project_path, auto_approve).await
}

#[tauri::command]
pub async fn telegram_stop_bot(app: AppHandle) -> Result<(), String> {
    let emitter = TauriEmitter(app);
    ccd_core::telegram::telegram_stop_bot(emitter).await
}

#[tauri::command]
pub async fn telegram_bot_status() -> Result<TelegramBotStatus, String> {
    ccd_core::telegram::telegram_bot_status().await
}
