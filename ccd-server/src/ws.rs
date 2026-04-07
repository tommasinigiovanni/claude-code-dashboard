use axum::extract::ws::{Message, WebSocket};
use futures::{SinkExt, StreamExt};
use serde::Serialize;
use std::collections::HashSet;
use std::sync::Arc;
use tokio::sync::{broadcast, mpsc, Mutex};

use crate::emitter::{WsEmitter, WsMessage};

#[derive(Serialize)]
struct CallResponse {
    id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    result: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

#[derive(Serialize)]
struct EventPush {
    r#type: String,
    channel: String,
    payload: String,
}

async fn handle_command(
    command: &str,
    _params: serde_json::Value,
    _emitter: &WsEmitter,
) -> Result<serde_json::Value, String> {
    match command {
        // We'll add all command handlers in Task 10
        // For now, just a few to verify the structure works
        "read_dashboard_data" => {
            let result = ccd_core::config::read_dashboard_data().await?;
            serde_json::to_value(result).map_err(|e| e.to_string())
        }
        "check_claude_installed" => {
            let result = ccd_core::launcher::check_claude_installed().await?;
            serde_json::to_value(result).map_err(|e| e.to_string())
        }
        _ => Err(format!("Command not yet implemented: {}", command)),
    }
}

pub async fn handle_socket(socket: WebSocket, tx: broadcast::Sender<WsMessage>) {
    let (mut ws_sender, mut ws_receiver) = socket.split();
    let subscriptions = Arc::new(Mutex::new(HashSet::<String>::new()));
    let emitter = WsEmitter::new(tx.clone());

    // Channel for sending messages back to the WebSocket client
    let (out_tx, mut out_rx) = mpsc::channel::<String>(256);

    // Task: Forward outgoing messages to WebSocket
    let send_task = tokio::spawn(async move {
        while let Some(msg) = out_rx.recv().await {
            if ws_sender.send(Message::Text(msg.into())).await.is_err() {
                break;
            }
        }
    });

    // Task: Forward subscribed events to client
    let subs_for_events = subscriptions.clone();
    let out_tx_events = out_tx.clone();
    let mut rx = tx.subscribe();
    let event_task = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            let subs = subs_for_events.lock().await;
            if subs.contains(&msg.channel) {
                let push = EventPush {
                    r#type: "event".to_string(),
                    channel: msg.channel,
                    payload: msg.payload,
                };
                if let Ok(json) = serde_json::to_string(&push) {
                    if out_tx_events.send(json).await.is_err() {
                        break;
                    }
                }
            }
        }
    });

    // Task: Process incoming messages
    let subs_for_cmds = subscriptions.clone();
    let out_tx_cmds = out_tx.clone();
    let recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = ws_receiver.next().await {
            let text = match msg {
                Message::Text(t) => t.to_string(),
                Message::Close(_) => break,
                _ => continue,
            };

            let Ok(incoming) = serde_json::from_str::<serde_json::Value>(&text) else {
                continue;
            };

            // Check if it's a subscribe/unsubscribe message
            if let Some(msg_type) = incoming.get("type").and_then(|v| v.as_str()) {
                match msg_type {
                    "subscribe" => {
                        if let Some(ch) = incoming.get("channel").and_then(|v| v.as_str()) {
                            subs_for_cmds.lock().await.insert(ch.to_string());
                        }
                    }
                    "unsubscribe" => {
                        if let Some(ch) = incoming.get("channel").and_then(|v| v.as_str()) {
                            subs_for_cmds.lock().await.remove(ch);
                        }
                    }
                    _ => {}
                }
                continue;
            }

            // It's a command call
            if let (Some(id), Some(command)) = (
                incoming.get("id").and_then(|v| v.as_str()),
                incoming.get("command").and_then(|v| v.as_str()),
            ) {
                let params = incoming
                    .get("params")
                    .cloned()
                    .unwrap_or(serde_json::Value::Null);
                let emitter = emitter.clone();
                let out_tx = out_tx_cmds.clone();
                let id = id.to_string();
                let command = command.to_string();

                // Handle command in a separate task so we don't block the message loop
                tokio::spawn(async move {
                    let response = handle_command(&command, params, &emitter).await;
                    let resp = match response {
                        Ok(val) => CallResponse {
                            id,
                            result: Some(val),
                            error: None,
                        },
                        Err(e) => CallResponse {
                            id,
                            result: None,
                            error: Some(e),
                        },
                    };
                    if let Ok(json) = serde_json::to_string(&resp) {
                        let _ = out_tx.send(json).await;
                    }
                });
            }
        }
    });

    // Wait for any task to finish, then clean up
    tokio::select! {
        _ = send_task => {},
        _ = event_task => {},
        _ = recv_task => {},
    }
}
