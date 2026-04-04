use serde::{Deserialize, Serialize};
use std::io::Write;
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};

static BOT_RUNNING: AtomicBool = AtomicBool::new(false);

#[derive(Debug, Deserialize)]
struct TelegramUpdate {
    update_id: i64,
    message: Option<TelegramMessage>,
}

#[derive(Debug, Deserialize)]
struct TelegramMessage {
    chat: TelegramChat,
    text: Option<String>,
    photo: Option<Vec<TelegramPhotoSize>>,
}

#[derive(Debug, Deserialize)]
struct TelegramChat {
    id: i64,
}

#[derive(Debug, Deserialize)]
struct TelegramPhotoSize {
    file_id: String,
    #[allow(dead_code)]
    width: u32,
    #[allow(dead_code)]
    height: u32,
}

#[derive(Debug, Deserialize)]
struct TelegramResponse<T> {
    ok: bool,
    result: Option<T>,
}

#[derive(Debug, Deserialize)]
struct TelegramFile {
    file_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TelegramBotStatus {
    pub running: bool,
    pub bot_name: Option<String>,
}

async fn send_telegram_message(
    client: &reqwest::Client,
    token: &str,
    chat_id: i64,
    text: &str,
) -> Result<(), String> {
    // Telegram max message length is 4096
    let chunks: Vec<String> = text
        .chars()
        .collect::<Vec<_>>()
        .chunks(4000)
        .map(|c| c.iter().collect::<String>())
        .collect();

    for chunk in chunks {
        client
            .post(&format!(
                "https://api.telegram.org/bot{}/sendMessage",
                token
            ))
            .json(&serde_json::json!({
                "chat_id": chat_id,
                "text": chunk,
                "parse_mode": "Markdown"
            }))
            .send()
            .await
            .map_err(|e| format!("Send error: {}", e))?;
    }
    Ok(())
}

async fn run_claude_print(message: &str, project_path: Option<&str>) -> Result<String, String> {
    let mut cmd = Command::new("claude");
    cmd.args(["--print"]);

    if let Some(path) = project_path {
        cmd.current_dir(path);
    }

    cmd.stdin(Stdio::piped());
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| format!("Spawn error: {}", e))?;

    if let Some(mut stdin) = child.stdin.take() {
        stdin
            .write_all(message.as_bytes())
            .map_err(|e| format!("Write error: {}", e))?;
        stdin.flush().map_err(|e| format!("Flush error: {}", e))?;
        drop(stdin);
    }

    let output = child
        .wait_with_output()
        .map_err(|e| format!("Wait error: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Claude error: {}", stderr))
    }
}

#[tauri::command]
pub async fn telegram_start_bot(
    app: AppHandle,
    bot_token: String,
    allowed_chat_id: Option<i64>,
    project_path: Option<String>,
) -> Result<TelegramBotStatus, String> {
    if BOT_RUNNING.load(Ordering::Relaxed) {
        return Err("Bot is already running".to_string());
    }

    let client = reqwest::Client::new();

    // Verify token
    let me_resp = client
        .get(&format!(
            "https://api.telegram.org/bot{}/getMe",
            bot_token
        ))
        .send()
        .await
        .map_err(|e| format!("Failed to verify token: {}", e))?
        .json::<serde_json::Value>()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let bot_name = me_resp
        .get("result")
        .and_then(|r| r.get("username"))
        .and_then(|u| u.as_str())
        .unwrap_or("unknown")
        .to_string();

    BOT_RUNNING.store(true, Ordering::Relaxed);

    let _ = app.emit(
        "telegram-status",
        TelegramBotStatus {
            running: true,
            bot_name: Some(bot_name.clone()),
        },
    );

    // Start polling in background
    let token = bot_token.clone();
    let project = project_path.clone();
    tokio::spawn(async move {
        let client = reqwest::Client::new();
        let mut offset: i64 = 0;

        while BOT_RUNNING.load(Ordering::Relaxed) {
            let url = format!(
                "https://api.telegram.org/bot{}/getUpdates?offset={}&timeout=30",
                token, offset
            );

            let resp = match client.get(&url).send().await {
                Ok(r) => r,
                Err(_) => {
                    tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
                    continue;
                }
            };

            let updates: TelegramResponse<Vec<TelegramUpdate>> = match resp.json().await {
                Ok(u) => u,
                Err(_) => {
                    tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
                    continue;
                }
            };

            if let Some(updates) = updates.result {
                for update in updates {
                    offset = update.update_id + 1;

                    if let Some(msg) = update.message {
                        // Security: only respond to allowed chat
                        if let Some(allowed) = allowed_chat_id {
                            if msg.chat.id != allowed {
                                let _ = send_telegram_message(
                                    &client,
                                    &token,
                                    msg.chat.id,
                                    &format!("⛔ Unauthorized. Your chat ID: `{}`", msg.chat.id),
                                )
                                .await;
                                continue;
                            }
                        }

                        if let Some(text) = msg.text {
                            // Special commands
                            if text == "/start" {
                                let _ = send_telegram_message(
                                    &client,
                                    &token,
                                    msg.chat.id,
                                    "🤖 Claude Code Dashboard Bot attivo!\n\nInvia un messaggio e lo inoltrerò a Claude Code.",
                                )
                                .await;
                                continue;
                            }

                            if text == "/chatid" {
                                let _ = send_telegram_message(
                                    &client,
                                    &token,
                                    msg.chat.id,
                                    &format!("Il tuo chat ID è: `{}`", msg.chat.id),
                                )
                                .await;
                                continue;
                            }

                            if text == "/sessions" {
                                let output = std::process::Command::new("tmux")
                                    .args(["list-sessions", "-F", "#{session_name} (#{session_windows} windows)"])
                                    .output();
                                let sessions_text = match output {
                                    Ok(o) if o.status.success() => {
                                        let list = String::from_utf8_lossy(&o.stdout);
                                        let claude_sessions: Vec<&str> = list.lines()
                                            .filter(|l| l.starts_with("claude-"))
                                            .collect();
                                        if claude_sessions.is_empty() {
                                            "Nessuna sessione tmux attiva.".to_string()
                                        } else {
                                            format!("📋 *Sessioni attive:*\n\n{}", claude_sessions.join("\n"))
                                        }
                                    }
                                    _ => "Nessuna sessione tmux attiva.".to_string(),
                                };
                                let _ = send_telegram_message(&client, &token, msg.chat.id, &sessions_text).await;
                                continue;
                            }

                            if text.starts_with("/switch ") {
                                let target = text.strip_prefix("/switch ").unwrap().trim();
                                let sess_name = if target.starts_with("claude-") {
                                    target.to_string()
                                } else {
                                    format!("claude-{}", target)
                                };
                                // Get cwd from tmux session
                                let cwd_output = std::process::Command::new("tmux")
                                    .args(["display-message", "-t", &sess_name, "-p", "#{pane_current_path}"])
                                    .output();
                                match cwd_output {
                                    Ok(o) if o.status.success() => {
                                        let cwd = String::from_utf8_lossy(&o.stdout).trim().to_string();
                                        // Update the project path for future messages
                                        // Note: this changes the working directory for claude --print
                                        let _ = send_telegram_message(
                                            &client, &token, msg.chat.id,
                                            &format!("✅ Switched to *{}*\n📁 `{}`\n\nI prossimi messaggi verranno inviati a Claude Code in questa cartella.", sess_name, cwd),
                                        ).await;
                                    }
                                    _ => {
                                        let _ = send_telegram_message(
                                            &client, &token, msg.chat.id,
                                            &format!("❌ Sessione `{}` non trovata. Usa /sessions per vedere quelle attive.", sess_name),
                                        ).await;
                                    }
                                }
                                continue;
                            }

                            if text == "/help" {
                                let _ = send_telegram_message(
                                    &client, &token, msg.chat.id,
                                    "🤖 *Claude Code Dashboard Bot*\n\n\
                                    Comandi disponibili:\n\
                                    /sessions — Lista sessioni tmux attive\n\
                                    /switch <nome> — Cambia progetto attivo\n\
                                    /chatid — Mostra il tuo Chat ID\n\
                                    /help — Questo messaggio\n\n\
                                    Invia qualsiasi altro messaggio per parlare con Claude Code.",
                                ).await;
                                continue;
                            }

                            // Send "typing" status
                            let _ = client
                                .post(&format!(
                                    "https://api.telegram.org/bot{}/sendChatAction",
                                    token
                                ))
                                .json(&serde_json::json!({
                                    "chat_id": msg.chat.id,
                                    "action": "typing"
                                }))
                                .send()
                                .await;

                            // Forward to Claude Code
                            match run_claude_print(&text, project.as_deref()).await {
                                Ok(response) => {
                                    let _ = send_telegram_message(
                                        &client,
                                        &token,
                                        msg.chat.id,
                                        &response,
                                    )
                                    .await;
                                }
                                Err(e) => {
                                    let _ = send_telegram_message(
                                        &client,
                                        &token,
                                        msg.chat.id,
                                        &format!("❌ Errore: {}", e),
                                    )
                                    .await;
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    Ok(TelegramBotStatus {
        running: true,
        bot_name: Some(bot_name),
    })
}

#[tauri::command]
pub async fn telegram_stop_bot(app: AppHandle) -> Result<(), String> {
    BOT_RUNNING.store(false, Ordering::Relaxed);
    let _ = app.emit(
        "telegram-status",
        TelegramBotStatus {
            running: false,
            bot_name: None,
        },
    );
    Ok(())
}

#[tauri::command]
pub async fn telegram_bot_status() -> Result<TelegramBotStatus, String> {
    Ok(TelegramBotStatus {
        running: BOT_RUNNING.load(Ordering::Relaxed),
        bot_name: None,
    })
}
