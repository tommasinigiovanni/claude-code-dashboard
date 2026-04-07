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
    params: serde_json::Value,
    emitter: &WsEmitter,
) -> Result<serde_json::Value, String> {
    match command {
        // ── Config ────────────────────────────────────────
        "read_dashboard_data" => {
            let result = ccd_core::config::read_dashboard_data().await?;
            serde_json::to_value(result).map_err(|e| e.to_string())
        }
        "read_config" => {
            let scope = params.get("scope").and_then(|v| v.as_str()).ok_or("Missing scope")?.to_string();
            let project_path = params.get("projectPath").and_then(|v| if v.is_null() { None } else { v.as_str() }).map(|s| s.to_string());
            let result = ccd_core::config::read_config(scope, project_path).await?;
            serde_json::to_value(result).map_err(|e| e.to_string())
        }
        "write_config" => {
            let scope = params.get("scope").and_then(|v| v.as_str()).ok_or("Missing scope")?.to_string();
            let project_path = params.get("projectPath").and_then(|v| if v.is_null() { None } else { v.as_str() }).map(|s| s.to_string());
            let config: ccd_core::types::ClaudeConfig = serde_json::from_value(
                params.get("config").ok_or("Missing config")?.clone()
            ).map_err(|e| format!("Invalid config: {}", e))?;
            ccd_core::config::write_config(scope, project_path, config).await?;
            Ok(serde_json::Value::Null)
        }
        "read_project_extras" => {
            let project_path = params.get("projectPath").and_then(|v| v.as_str()).ok_or("Missing projectPath")?.to_string();
            let result = ccd_core::config::read_project_extras(project_path).await?;
            serde_json::to_value(result).map_err(|e| e.to_string())
        }
        "get_claude_home" => {
            let result = ccd_core::config::get_claude_home().await?;
            serde_json::to_value(result).map_err(|e| e.to_string())
        }
        "read_agent_file" => {
            let path = params.get("path").and_then(|v| v.as_str()).ok_or("Missing path")?.to_string();
            let result = ccd_core::config::read_agent_file(path).await?;
            serde_json::to_value(result).map_err(|e| e.to_string())
        }
        "write_agent_file" => {
            let path = params.get("path").and_then(|v| v.as_str()).ok_or("Missing path")?.to_string();
            let content = params.get("content").and_then(|v| v.as_str()).ok_or("Missing content")?.to_string();
            ccd_core::config::write_agent_file(path, content).await?;
            Ok(serde_json::Value::Null)
        }
        "delete_agent_file" => {
            let path = params.get("path").and_then(|v| v.as_str()).ok_or("Missing path")?.to_string();
            ccd_core::config::delete_agent_file(path).await?;
            Ok(serde_json::Value::Null)
        }
        "toggle_plugin" => {
            let plugin_id = params.get("pluginId").and_then(|v| v.as_str()).ok_or("Missing pluginId")?.to_string();
            let enabled = params.get("enabled").and_then(|v| v.as_bool()).ok_or("Missing enabled")?;
            ccd_core::config::toggle_plugin(plugin_id, enabled).await?;
            Ok(serde_json::Value::Null)
        }
        "health_check_mcp" => {
            let result = ccd_core::config::health_check_mcp().await?;
            serde_json::to_value(result).map_err(|e| e.to_string())
        }

        // ── Terminal ──────────────────────────────────────
        "terminal_spawn" => {
            let project_path = params.get("projectPath").and_then(|v| if v.is_null() { None } else { v.as_str() }).map(|s| s.to_string());
            let use_tmux = params.get("useTmux").and_then(|v| v.as_bool());
            let tmux_attach = params.get("tmuxAttachSession").and_then(|v| if v.is_null() { None } else { v.as_str() }).map(|s| s.to_string());
            let ssh_config: Option<ccd_core::ssh::SshConfig> = params.get("sshConfig")
                .and_then(|v| if v.is_null() { None } else { serde_json::from_value(v.clone()).ok() });
            let result = ccd_core::terminal::terminal_spawn(emitter.clone(), project_path, use_tmux, tmux_attach, ssh_config).await?;
            serde_json::to_value(result).map_err(|e| e.to_string())
        }
        "terminal_write" => {
            let session_id = params.get("sessionId").and_then(|v| v.as_str()).ok_or("Missing sessionId")?.to_string();
            let data = params.get("data").and_then(|v| v.as_str()).ok_or("Missing data")?.to_string();
            ccd_core::terminal::terminal_write(session_id, data).await?;
            Ok(serde_json::Value::Null)
        }
        "terminal_resize" => {
            let session_id = params.get("sessionId").and_then(|v| v.as_str()).ok_or("Missing sessionId")?.to_string();
            let rows = params.get("rows").and_then(|v| v.as_u64()).ok_or("Missing rows")? as u16;
            let cols = params.get("cols").and_then(|v| v.as_u64()).ok_or("Missing cols")? as u16;
            ccd_core::terminal::terminal_resize(session_id, rows, cols).await?;
            Ok(serde_json::Value::Null)
        }
        "tmux_list_sessions" => {
            let result = ccd_core::terminal::tmux_list_sessions().await?;
            serde_json::to_value(result).map_err(|e| e.to_string())
        }
        "tmux_kill_session" => {
            let session_name = params.get("sessionName").and_then(|v| v.as_str()).ok_or("Missing sessionName")?.to_string();
            ccd_core::terminal::tmux_kill_session(session_name).await?;
            Ok(serde_json::Value::Null)
        }
        "tmux_session_cwd" => {
            let session_name = params.get("sessionName").and_then(|v| v.as_str()).ok_or("Missing sessionName")?.to_string();
            let result = ccd_core::terminal::tmux_session_cwd(session_name).await?;
            serde_json::to_value(result).map_err(|e| e.to_string())
        }

        // ── SSH ───────────────────────────────────────────
        "ssh_test_connection" => {
            let config: ccd_core::ssh::SshConfig = serde_json::from_value(
                params.get("config").ok_or("Missing config")?.clone()
            ).map_err(|e| format!("Invalid config: {}", e))?;
            let result = ccd_core::ssh::ssh_test_connection(config).await?;
            serde_json::to_value(result).map_err(|e| e.to_string())
        }
        "ssh_read_config" => {
            let config: ccd_core::ssh::SshConfig = serde_json::from_value(
                params.get("config").ok_or("Missing config")?.clone()
            ).map_err(|e| format!("Invalid config: {}", e))?;
            let remote_path = params.get("remotePath").and_then(|v| v.as_str()).ok_or("Missing remotePath")?.to_string();
            let result = ccd_core::ssh::ssh_read_config(config, remote_path).await?;
            serde_json::to_value(result).map_err(|e| e.to_string())
        }
        "ssh_write_config" => {
            let config: ccd_core::ssh::SshConfig = serde_json::from_value(
                params.get("config").ok_or("Missing config")?.clone()
            ).map_err(|e| format!("Invalid config: {}", e))?;
            let remote_path = params.get("remotePath").and_then(|v| v.as_str()).ok_or("Missing remotePath")?.to_string();
            let content = params.get("content").and_then(|v| v.as_str()).ok_or("Missing content")?.to_string();
            ccd_core::ssh::ssh_write_config(config, remote_path, content).await?;
            Ok(serde_json::Value::Null)
        }
        "ssh_read_dashboard_data" => {
            let config: ccd_core::ssh::SshConfig = serde_json::from_value(
                params.get("config").ok_or("Missing config")?.clone()
            ).map_err(|e| format!("Invalid config: {}", e))?;
            let result = ccd_core::ssh::ssh_read_dashboard_data(config).await?;
            serde_json::to_value(result).map_err(|e| e.to_string())
        }
        "ssh_health_check_mcp" => {
            let config: ccd_core::ssh::SshConfig = serde_json::from_value(
                params.get("config").ok_or("Missing config")?.clone()
            ).map_err(|e| format!("Invalid config: {}", e))?;
            let result = ccd_core::ssh::ssh_health_check_mcp(config).await?;
            serde_json::to_value(result).map_err(|e| e.to_string())
        }
        "ssh_tmux_list_sessions" => {
            let config: ccd_core::ssh::SshConfig = serde_json::from_value(
                params.get("config").ok_or("Missing config")?.clone()
            ).map_err(|e| format!("Invalid config: {}", e))?;
            let result = ccd_core::ssh::ssh_tmux_list_sessions(config).await?;
            serde_json::to_value(result).map_err(|e| e.to_string())
        }
        "ssh_tmux_kill_session" => {
            let config: ccd_core::ssh::SshConfig = serde_json::from_value(
                params.get("config").ok_or("Missing config")?.clone()
            ).map_err(|e| format!("Invalid config: {}", e))?;
            let session_name = params.get("sessionName").and_then(|v| v.as_str()).ok_or("Missing sessionName")?.to_string();
            ccd_core::ssh::ssh_tmux_kill_session(config, session_name).await?;
            Ok(serde_json::Value::Null)
        }

        // ── Chat ──────────────────────────────────────────
        "chat_start" => {
            let project_path = params.get("projectPath").and_then(|v| if v.is_null() { None } else { v.as_str() }).map(|s| s.to_string());
            let ssh_config: Option<ccd_core::ssh::SshConfig> = params.get("sshConfig")
                .and_then(|v| if v.is_null() { None } else { serde_json::from_value(v.clone()).ok() });
            let result = ccd_core::chat::chat_start(emitter.clone(), project_path, ssh_config).await?;
            serde_json::to_value(result).map_err(|e| e.to_string())
        }
        "chat_send" => {
            let session_id = params.get("sessionId").and_then(|v| v.as_str()).ok_or("Missing sessionId")?.to_string();
            let message = params.get("message").and_then(|v| v.as_str()).ok_or("Missing message")?.to_string();
            ccd_core::chat::chat_send(session_id, message).await?;
            Ok(serde_json::Value::Null)
        }
        "chat_approve" => {
            let session_id = params.get("sessionId").and_then(|v| v.as_str()).ok_or("Missing sessionId")?.to_string();
            let approved = params.get("approved").and_then(|v| v.as_bool()).ok_or("Missing approved")?;
            ccd_core::chat::chat_approve(session_id, approved).await?;
            Ok(serde_json::Value::Null)
        }
        "save_temp_image" => {
            let data: Vec<u8> = params.get("data")
                .and_then(|v| serde_json::from_value(v.clone()).ok())
                .ok_or("Missing data")?;
            let extension = params.get("extension").and_then(|v| v.as_str()).ok_or("Missing extension")?.to_string();
            let result = ccd_core::chat::save_temp_image(data, extension).await?;
            serde_json::to_value(result).map_err(|e| e.to_string())
        }

        // ── Telegram ──────────────────────────────────────
        "telegram_bot_status" => {
            let result = ccd_core::telegram::telegram_bot_status().await?;
            serde_json::to_value(result).map_err(|e| e.to_string())
        }
        "telegram_start_bot" => {
            let bot_token = params.get("botToken").and_then(|v| v.as_str()).ok_or("Missing botToken")?.to_string();
            let allowed_chat_id = params.get("allowedChatId").and_then(|v| if v.is_null() { None } else { v.as_i64() });
            let project_path = params.get("projectPath").and_then(|v| if v.is_null() { None } else { v.as_str() }).map(|s| s.to_string());
            let auto_approve = params.get("autoApprove").and_then(|v| v.as_bool());
            let result = ccd_core::telegram::telegram_start_bot(emitter.clone(), bot_token, allowed_chat_id, project_path, auto_approve).await?;
            serde_json::to_value(result).map_err(|e| e.to_string())
        }
        "telegram_stop_bot" => {
            ccd_core::telegram::telegram_stop_bot(emitter.clone()).await?;
            Ok(serde_json::Value::Null)
        }

        // ── Profiles ──────────────────────────────────────
        "list_profiles" => {
            let result = ccd_core::profiles::list_profiles().await?;
            serde_json::to_value(result).map_err(|e| e.to_string())
        }
        "save_profile" => {
            let name = params.get("name").and_then(|v| v.as_str()).ok_or("Missing name")?.to_string();
            let description = params.get("description").and_then(|v| v.as_str()).ok_or("Missing description")?.to_string();
            ccd_core::profiles::save_profile(name, description).await?;
            Ok(serde_json::Value::Null)
        }
        "load_profile" => {
            let name = params.get("name").and_then(|v| v.as_str()).ok_or("Missing name")?.to_string();
            ccd_core::profiles::load_profile(name).await?;
            Ok(serde_json::Value::Null)
        }
        "delete_profile" => {
            let name = params.get("name").and_then(|v| v.as_str()).ok_or("Missing name")?.to_string();
            ccd_core::profiles::delete_profile(name).await?;
            Ok(serde_json::Value::Null)
        }

        // ── Hooks ─────────────────────────────────────────
        "read_hooks" => {
            let result = ccd_core::hooks::read_hooks().await?;
            serde_json::to_value(result).map_err(|e| e.to_string())
        }
        "write_hooks" => {
            let hooks = params.get("hooks").ok_or("Missing hooks")?.clone();
            ccd_core::hooks::write_hooks(hooks).await?;
            Ok(serde_json::Value::Null)
        }

        // ── Backups ───────────────────────────────────────
        "auto_backup" => {
            let result = ccd_core::backup::auto_backup().await?;
            serde_json::to_value(result).map_err(|e| e.to_string())
        }
        "list_backups" => {
            let result = ccd_core::backup::list_backups().await?;
            serde_json::to_value(result).map_err(|e| e.to_string())
        }
        "restore_backup" => {
            let filename = params.get("filename").and_then(|v| v.as_str()).ok_or("Missing filename")?.to_string();
            ccd_core::backup::restore_backup(filename).await?;
            Ok(serde_json::Value::Null)
        }
        "delete_backup" => {
            let filename = params.get("filename").and_then(|v| v.as_str()).ok_or("Missing filename")?.to_string();
            ccd_core::backup::delete_backup(filename).await?;
            Ok(serde_json::Value::Null)
        }

        // ── Import/Export ─────────────────────────────────
        "export_config" => {
            let result = ccd_core::import_export::export_config().await?;
            serde_json::to_value(result).map_err(|e| e.to_string())
        }
        "import_config" => {
            let bundle_json = params.get("bundleJson").and_then(|v| v.as_str()).ok_or("Missing bundleJson")?.to_string();
            let result = ccd_core::import_export::import_config(bundle_json).await?;
            serde_json::to_value(result).map_err(|e| e.to_string())
        }

        // ── Launcher ──────────────────────────────────────
        "check_claude_installed" => {
            let result = ccd_core::launcher::check_claude_installed().await?;
            serde_json::to_value(result).map_err(|e| e.to_string())
        }

        // ── Monitoring ────────────────────────────────────
        "read_session_logs" => {
            let project_path = params.get("projectPath").and_then(|v| if v.is_null() { None } else { v.as_str() }).map(|s| s.to_string());
            let max_entries = params.get("maxEntries").and_then(|v| v.as_u64()).map(|v| v as usize);
            let result = ccd_core::logs::read_session_logs(project_path, max_entries).await?;
            serde_json::to_value(result).map_err(|e| e.to_string())
        }
        "read_usage_stats" => {
            let result = ccd_core::usage::read_usage_stats().await?;
            serde_json::to_value(result).map_err(|e| e.to_string())
        }
        "read_memories" => {
            let project_path = params.get("projectPath").and_then(|v| if v.is_null() { None } else { v.as_str() }).map(|s| s.to_string());
            let result = ccd_core::learning::read_memories(project_path).await?;
            serde_json::to_value(result).map_err(|e| e.to_string())
        }
        "run_verification" => {
            let prompt = params.get("prompt").and_then(|v| v.as_str()).ok_or("Missing prompt")?.to_string();
            let project_path = params.get("projectPath").and_then(|v| if v.is_null() { None } else { v.as_str() }).map(|s| s.to_string());
            let result = ccd_core::verification::run_verification(prompt, project_path).await?;
            serde_json::to_value(result).map_err(|e| e.to_string())
        }

        // ── Desktop-only (not available in web mode) ──────
        "pick_directory" | "launch_claude_code" | "open_folder" => {
            Err(format!("{} is not available in web mode", command))
        }

        _ => Err(format!("Unknown command: {}", command)),
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
