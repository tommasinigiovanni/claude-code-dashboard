use ccd_core::events::EventEmitter;
use tokio::sync::broadcast;

#[derive(Debug, Clone)]
pub struct WsMessage {
    pub channel: String,
    pub payload: String,
}

#[derive(Clone)]
pub struct WsEmitter {
    tx: broadcast::Sender<WsMessage>,
}

impl WsEmitter {
    pub fn new(tx: broadcast::Sender<WsMessage>) -> Self {
        Self { tx }
    }
}

impl EventEmitter for WsEmitter {
    fn emit(&self, event_name: &str, payload: String) {
        let _ = self.tx.send(WsMessage {
            channel: event_name.to_string(),
            payload,
        });
    }
}
