/// Abstraction for emitting events to the frontend.
/// Tauri implements this via AppHandle::emit().
/// The web server implements this via WebSocket broadcast.
pub trait EventEmitter: Send + Sync + 'static {
    fn emit(&self, event_name: &str, payload: String);
}

impl<T: EventEmitter> EventEmitter for std::sync::Arc<T> {
    fn emit(&self, event_name: &str, payload: String) {
        (**self).emit(event_name, payload)
    }
}
