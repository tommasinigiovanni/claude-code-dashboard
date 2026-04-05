use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::Write;
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};

static BOT_RUNNING: AtomicBool = AtomicBool::new(false);

// Track Claude session IDs per Telegram chat
static CHAT_SESSIONS: once_cell::sync::Lazy<Mutex<HashMap<i64, String>>> =
    once_cell::sync::Lazy::new(|| Mutex::new(HashMap::new()));

#[derive(Debug, Deserialize)]
struct TelegramUpdate {
    update_id: i64,
    message: Option<TelegramMessage>,
    callback_query: Option<TelegramCallbackQuery>,
}

#[derive(Debug, Deserialize)]
struct TelegramCallbackQuery {
    id: String,
    #[allow(dead_code)]
    from: TelegramUser,
    message: Option<TelegramCallbackMessage>,
    data: Option<String>,
}

#[derive(Debug, Deserialize)]
struct TelegramUser {
    #[allow(dead_code)]
    id: i64,
}

#[derive(Debug, Deserialize)]
struct TelegramCallbackMessage {
    chat: TelegramChat,
}

#[derive(Debug, Deserialize)]
struct TelegramMessage {
    chat: TelegramChat,
    text: Option<String>,
    #[allow(dead_code)]
    photo: Option<Vec<TelegramPhotoSize>>,
}

#[derive(Debug, Deserialize)]
struct TelegramChat {
    id: i64,
}

#[derive(Debug, Deserialize)]
struct TelegramPhotoSize {
    #[allow(dead_code)]
    file_id: String,
    #[allow(dead_code)]
    width: u32,
    #[allow(dead_code)]
    height: u32,
}

#[derive(Debug, Deserialize)]
struct TelegramResponse<T> {
    #[allow(dead_code)]
    ok: bool,
    result: Option<T>,
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

async fn send_telegram_with_buttons(
    client: &reqwest::Client,
    token: &str,
    chat_id: i64,
    text: &str,
    buttons: Vec<Vec<(String, String)>>, // rows of (label, callback_data)
) -> Result<(), String> {
    let keyboard: Vec<Vec<serde_json::Value>> = buttons
        .iter()
        .map(|row| {
            row.iter()
                .map(|(label, data)| {
                    serde_json::json!({"text": label, "callback_data": data})
                })
                .collect()
        })
        .collect();

    client
        .post(&format!("https://api.telegram.org/bot{}/sendMessage", token))
        .json(&serde_json::json!({
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "Markdown",
            "reply_markup": {"inline_keyboard": keyboard}
        }))
        .send()
        .await
        .map_err(|e| format!("Send error: {}", e))?;
    Ok(())
}

async fn answer_callback(client: &reqwest::Client, token: &str, callback_id: &str, text: &str) {
    let _ = client
        .post(&format!("https://api.telegram.org/bot{}/answerCallbackQuery", token))
        .json(&serde_json::json!({
            "callback_query_id": callback_id,
            "text": text
        }))
        .send()
        .await;
}

fn get_tmux_sessions() -> Vec<String> {
    let output = std::process::Command::new("tmux")
        .args(["list-sessions", "-F", "#{session_name}"])
        .output();
    match output {
        Ok(o) if o.status.success() => {
            String::from_utf8_lossy(&o.stdout)
                .lines()
                .filter(|l| l.starts_with("claude-"))
                .map(|l| l.to_string())
                .collect()
        }
        _ => Vec::new(),
    }
}

async fn run_claude_print(
    chat_id: i64,
    message: &str,
    project_path: Option<&str>,
    skip_permissions: bool,
) -> Result<String, String> {
    let mut cmd = Command::new("claude");
    cmd.args(["--print"]);

    if skip_permissions {
        cmd.arg("--dangerously-skip-permissions");
    }

    // Check if we have an existing session for this chat
    let existing_session = CHAT_SESSIONS.lock().unwrap().get(&chat_id).cloned();

    if let Some(ref sess_id) = existing_session {
        // Continue existing session
        cmd.args(["-c", "-r", sess_id]);
    } else {
        // New session
        let new_id = uuid::Uuid::new_v4().to_string();
        cmd.args(["--session-id", &new_id]);
        CHAT_SESSIONS.lock().unwrap().insert(chat_id, new_id);
    }

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
    auto_approve: Option<bool>,
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

    // Register bot menu commands
    let _ = client
        .post(&format!("https://api.telegram.org/bot{}/setMyCommands", bot_token))
        .json(&serde_json::json!({
            "commands": [
                {"command": "menu", "description": "Main menu with buttons"},
                {"command": "sessions", "description": "Active tmux sessions"},
                {"command": "new", "description": "Start new conversation"},
                {"command": "help", "description": "Show available commands"},
                {"command": "chatid", "description": "Show your Chat ID"}
            ]
        }))
        .send()
        .await;

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
    let skip_permissions = auto_approve.unwrap_or(false);
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
                            if text == "/start" || text == "/menu" {
                                let mut buttons = vec![
                                    vec![
                                        ("📋 Sessioni".to_string(), "cmd:sessions".to_string()),
                                        ("🆕 Nuova chat".to_string(), "cmd:new".to_string()),
                                        ("❓ Help".to_string(), "cmd:help".to_string()),
                                    ],
                                ];
                                // Add session buttons
                                let sessions = get_tmux_sessions();
                                for sess in sessions.iter().take(6) {
                                    let short = sess.replace("claude-", "");
                                    buttons.push(vec![
                                        (format!("🔄 {}", short), format!("switch:{}", sess)),
                                    ]);
                                }
                                let _ = send_telegram_with_buttons(
                                    &client, &token, msg.chat.id,
                                    "🤖 *Claude Code Dashboard*\n\nInvia un messaggio per parlare con Claude Code.\nUsa i bottoni per navigare.",
                                    buttons,
                                ).await;
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
                                let sessions = get_tmux_sessions();
                                if sessions.is_empty() {
                                    let _ = send_telegram_message(&client, &token, msg.chat.id, "Nessuna sessione tmux attiva.").await;
                                } else {
                                    let buttons: Vec<Vec<(String, String)>> = sessions.iter().map(|s| {
                                        let short = s.replace("claude-", "");
                                        vec![(format!("🔄 {}", short), format!("switch:{}", s))]
                                    }).collect();
                                    let _ = send_telegram_with_buttons(
                                        &client, &token, msg.chat.id,
                                        "📋 *Sessioni attive* — tocca per switchare:",
                                        buttons,
                                    ).await;
                                }
                                continue;
                            }

                            if let Some(target) = text.strip_prefix("/switch ") {
                                let target = target.trim();
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
                                        // Reset session for new project context
                                        CHAT_SESSIONS.lock().unwrap().remove(&msg.chat.id);
                                        let _ = send_telegram_message(
                                            &client, &token, msg.chat.id,
                                            &format!("✅ Switched to *{}*\n📁 `{}`\n\n🆕 Nuova conversazione in questo progetto.", sess_name, cwd),
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

                            if text == "/new" {
                                CHAT_SESSIONS.lock().unwrap().remove(&msg.chat.id);
                                let _ = send_telegram_message(
                                    &client, &token, msg.chat.id,
                                    "🆕 Nuova conversazione iniziata. Claude non ricorderà i messaggi precedenti.",
                                ).await;
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
                            match run_claude_print(msg.chat.id, &text, project.as_deref(), skip_permissions).await {
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

                    // Handle callback queries (button presses)
                    if let Some(cb) = update.callback_query {
                        let chat_id = cb.message.as_ref().map(|m| m.chat.id).unwrap_or(0);
                        let data = cb.data.unwrap_or_default();

                        if let Some(sess_name_str) = data.strip_prefix("switch:") {
                            let sess_name = sess_name_str;
                            let cwd_output = std::process::Command::new("tmux")
                                .args(["display-message", "-t", sess_name, "-p", "#{pane_current_path}"])
                                .output();
                            match cwd_output {
                                Ok(o) if o.status.success() => {
                                    let cwd = String::from_utf8_lossy(&o.stdout).trim().to_string();
                                    answer_callback(&client, &token, &cb.id, &format!("✅ {}", sess_name)).await;
                                    let _ = send_telegram_message(
                                        &client, &token, chat_id,
                                        &format!("✅ Switched to *{}*\n📁 `{}`", sess_name, cwd),
                                    ).await;
                                }
                                _ => {
                                    answer_callback(&client, &token, &cb.id, "❌ Session not found").await;
                                }
                            }
                        } else if data == "cmd:sessions" {
                            answer_callback(&client, &token, &cb.id, "📋 Loading...").await;
                            let sessions = get_tmux_sessions();
                            if sessions.is_empty() {
                                let _ = send_telegram_message(&client, &token, chat_id, "Nessuna sessione attiva.").await;
                            } else {
                                let buttons: Vec<Vec<(String, String)>> = sessions.iter().map(|s| {
                                    let short = s.replace("claude-", "");
                                    vec![(format!("🔄 {}", short), format!("switch:{}", s))]
                                }).collect();
                                let _ = send_telegram_with_buttons(
                                    &client, &token, chat_id,
                                    "📋 *Sessioni attive:*",
                                    buttons,
                                ).await;
                            }
                        } else if data == "cmd:new" {
                            CHAT_SESSIONS.lock().unwrap().remove(&chat_id);
                            answer_callback(&client, &token, &cb.id, "🆕 Nuova conversazione").await;
                            let _ = send_telegram_message(
                                &client, &token, chat_id,
                                "🆕 Nuova conversazione iniziata!",
                            ).await;
                        } else if data == "cmd:help" {
                            answer_callback(&client, &token, &cb.id, "❓").await;
                            let _ = send_telegram_message(
                                &client, &token, chat_id,
                                "🤖 *Claude Code Dashboard Bot*\n\n\
                                /menu — Menu principale con bottoni\n\
                                /sessions — Lista sessioni con bottoni\n\
                                /switch <nome> — Cambia progetto\n\
                                /new — Nuova conversazione (reset memoria)\n\
                                /chatid — Il tuo Chat ID\n\
                                /help — Questo messaggio\n\n\
                                Claude ricorda i messaggi precedenti nella stessa conversazione.\n\
                                Usa /new o 🆕 per ricominciare.",
                            ).await;
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
