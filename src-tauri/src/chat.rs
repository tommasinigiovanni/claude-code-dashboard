use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader, Write};
use std::process::{Command, Stdio};
use tauri::{AppHandle, Emitter};

#[tauri::command]
pub async fn save_temp_image(data: Vec<u8>, extension: String) -> Result<String, String> {
    let temp_dir = std::env::temp_dir().join("claude-dashboard-images");
    std::fs::create_dir_all(&temp_dir)
        .map_err(|e| format!("Failed to create temp dir: {}", e))?;

    let filename = format!("{}.{}", uuid::Uuid::new_v4(), extension);
    let path = temp_dir.join(&filename);

    std::fs::write(&path, &data)
        .map_err(|e| format!("Failed to write image: {}", e))?;

    Ok(path.to_string_lossy().to_string())
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatStreamEvent {
    pub session_id: String,
    pub event_type: String,
    pub content: String,
}

#[tauri::command]
pub async fn chat_send_message(
    app: AppHandle,
    message: String,
    session_id: Option<String>,
    project_path: Option<String>,
    auto_approve: Option<bool>,
) -> Result<String, String> {
    let is_continuation = session_id.is_some();
    let sess_id = session_id.unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
    let event_name = format!("chat-stream-{}", sess_id);
    let sess_id_clone = sess_id.clone();

    std::thread::spawn(move || {
        let mut cmd = Command::new("claude");
        cmd.args(["--print", "--output-format", "stream-json", "--verbose"]);

        if auto_approve.unwrap_or(false) {
            cmd.arg("--dangerously-skip-permissions");
        }

        if is_continuation {
            cmd.args(["-c", "-r", &sess_id_clone]);
        } else {
            cmd.args(["--session-id", &sess_id_clone]);
        }

        if let Some(ref path) = project_path {
            cmd.current_dir(path);
        }

        cmd.stdin(Stdio::piped());
        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());

        let mut child = match cmd.spawn() {
            Ok(c) => c,
            Err(e) => {
                let _ = app.emit(
                    &event_name,
                    ChatStreamEvent {
                        session_id: sess_id_clone,
                        event_type: "error".to_string(),
                        content: format!("Failed to start claude: {}", e),
                    },
                );
                return;
            }
        };

        // Write message to stdin and close it
        if let Some(mut stdin) = child.stdin.take() {
            let _ = stdin.write_all(message.as_bytes());
            let _ = stdin.flush();
            drop(stdin);
        }

        // Read stdout line by line
        if let Some(stdout) = child.stdout.take() {
            let reader = BufReader::new(stdout);
            let mut last_text = String::new();

            for line in reader.lines().flatten() {
                if line.is_empty() {
                    continue;
                }

                let parsed: Result<serde_json::Value, _> = serde_json::from_str(&line);
                if let Ok(val) = parsed {
                    let msg_type = val.get("type").and_then(|t| t.as_str()).unwrap_or("");

                    match msg_type {
                        "assistant" => {
                            if let Some(msg) = val.get("message") {
                                if let Some(content) =
                                    msg.get("content").and_then(|c| c.as_array())
                                {
                                    for item in content {
                                        let item_type = item
                                            .get("type")
                                            .and_then(|t| t.as_str())
                                            .unwrap_or("");
                                        match item_type {
                                            "text" => {
                                                if let Some(text) =
                                                    item.get("text").and_then(|t| t.as_str())
                                                {
                                                    last_text = text.to_string();
                                                    let _ = app.emit(
                                                        &event_name,
                                                        ChatStreamEvent {
                                                            session_id: sess_id_clone.clone(),
                                                            event_type: "text".to_string(),
                                                            content: text.to_string(),
                                                        },
                                                    );
                                                }
                                            }
                                            "thinking" => {
                                                if let Some(text) =
                                                    item.get("thinking").and_then(|t| t.as_str())
                                                {
                                                    let _ = app.emit(
                                                        &event_name,
                                                        ChatStreamEvent {
                                                            session_id: sess_id_clone.clone(),
                                                            event_type: "thinking".to_string(),
                                                            content: text.to_string(),
                                                        },
                                                    );
                                                }
                                            }
                                            _ => {}
                                        }
                                    }
                                }
                            }
                        }
                        "result" => {
                            let result_text = val
                                .get("result")
                                .and_then(|r| r.as_str())
                                .unwrap_or(&last_text)
                                .to_string();
                            let _ = app.emit(
                                &event_name,
                                ChatStreamEvent {
                                    session_id: sess_id_clone.clone(),
                                    event_type: "done".to_string(),
                                    content: result_text,
                                },
                            );
                            return;
                        }
                        _ => {}
                    }
                }
            }
        }

        // Fallback done event
        let _ = app.emit(
            &event_name,
            ChatStreamEvent {
                session_id: sess_id_clone,
                event_type: "done".to_string(),
                content: String::new(),
            },
        );
    });

    Ok(sess_id)
}
