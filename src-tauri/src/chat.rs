use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};

#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;

// ─── Types ────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatEvent {
    pub session_id: String,
    pub event_type: String, // "text", "permission", "done", "error", "waiting"
    pub content: String,
}

struct ChatPtySession {
    writer: Box<dyn Write + Send>,
    #[allow(dead_code)]
    master: Box<dyn MasterPty + Send>,
}

static CHAT_SESSIONS: once_cell::sync::Lazy<Mutex<HashMap<String, ChatPtySession>>> =
    once_cell::sync::Lazy::new(|| Mutex::new(HashMap::new()));

// ─── ANSI stripper ────────────────────────────────────

fn strip_ansi(text: &str) -> String {
    let mut result = String::new();
    let mut chars = text.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '\x1b' {
            // Skip escape sequence
            if let Some(&next) = chars.peek() {
                if next == '[' {
                    chars.next();
                    while let Some(&nc) = chars.peek() {
                        chars.next();
                        if nc.is_ascii_alphabetic() || nc == '~' {
                            break;
                        }
                    }
                } else if next == ']' {
                    // OSC sequence - skip until BEL or ST
                    chars.next();
                    while let Some(&nc) = chars.peek() {
                        chars.next();
                        if nc == '\x07' {
                            break;
                        }
                        if nc == '\x1b' {
                            if chars.peek() == Some(&'\\') {
                                chars.next();
                            }
                            break;
                        }
                    }
                }
            }
        } else if c == '\r' {
            // Skip carriage returns
        } else {
            result.push(c);
        }
    }
    result
}

// ─── Permission detection ─────────────────────────────

fn detect_permission_request(clean_text: &str) -> Option<String> {
    // Claude Code permission prompts contain patterns like:
    // "Allow Read(...)" or "Allow Bash(command)" or "Allow Edit" etc.
    // They end with a question or prompt for y/n
    let lower = clean_text.to_lowercase();
    if (lower.contains("allow") && (lower.contains("(y)es") || lower.contains("(n)o") || lower.contains("? (y")))
        || (lower.contains("do you want") && lower.contains("?"))
        || (lower.contains("permission") && lower.contains("allow"))
    {
        // Extract the tool/action description
        let lines: Vec<&str> = clean_text.lines().collect();
        let relevant: Vec<&str> = lines
            .iter()
            .filter(|l| {
                let ll = l.to_lowercase();
                ll.contains("allow") || ll.contains("permission") || ll.contains("do you want")
            })
            .copied()
            .collect();
        if !relevant.is_empty() {
            return Some(relevant.join("\n"));
        }
        return Some(clean_text.to_string());
    }
    None
}

fn detect_waiting_for_input(clean_text: &str) -> bool {
    let trimmed = clean_text.trim();
    // Claude Code shows ">" or "❯" when waiting for input
    trimmed.ends_with('>')
        || trimmed.ends_with('❯')
        || trimmed.ends_with("$ ")
}

// ─── Commands ─────────────────────────────────────────

#[tauri::command]
pub async fn chat_start(
    app: AppHandle,
    project_path: Option<String>,
    ssh_config: Option<crate::ssh::SshConfig>,
) -> Result<String, String> {
    let session_id = uuid::Uuid::new_v4().to_string();
    let pty_system = native_pty_system();

    let pair = pty_system
        .openpty(PtySize {
            rows: 50,
            cols: 120,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("PTY error: {}", e))?;

    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
    let mut cmd = CommandBuilder::new(&shell);
    cmd.env("TERM", "xterm-256color");

    if let Some(ref path) = project_path {
        cmd.cwd(path);
    }

    let _child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("Spawn error: {}", e))?;

    drop(pair.slave);

    let writer = pair
        .master
        .take_writer()
        .map_err(|e| format!("Writer error: {}", e))?;

    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| format!("Reader error: {}", e))?;

    let sid = session_id.clone();
    CHAT_SESSIONS.lock().unwrap().insert(
        sid.clone(),
        ChatPtySession {
            writer,
            master: pair.master,
        },
    );

    // Start claude in the PTY after shell is ready (SSH if configured)
    let sid_for_start = session_id.clone();
    let ssh_cfg = ssh_config.clone();
    let project_for_start = project_path.clone();
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(500));

        // If SSH, connect first
        if let Some(ref cfg) = ssh_cfg {
            let ssh_cmd = crate::ssh::get_ssh_command(cfg);
            {
                let mut s = CHAT_SESSIONS.lock().unwrap();
                if let Some(session) = s.get_mut(&sid_for_start) {
                    let _ = session.writer.write_all(format!("{}\n", ssh_cmd).as_bytes());
                    let _ = session.writer.flush();
                }
            }
            std::thread::sleep(std::time::Duration::from_millis(2000));

            // cd to project on remote
            if let Some(ref path) = project_for_start {
                let mut s = CHAT_SESSIONS.lock().unwrap();
                if let Some(session) = s.get_mut(&sid_for_start) {
                    let _ = session.writer.write_all(format!("cd '{}'\n", path).as_bytes());
                    let _ = session.writer.flush();
                }
                std::thread::sleep(std::time::Duration::from_millis(300));
            }
        }

        let mut sessions = CHAT_SESSIONS.lock().unwrap();
        if let Some(session) = sessions.get_mut(&sid_for_start) {
            let _ = session.writer.write_all(b"claude\n");
            let _ = session.writer.flush();
        }
    });

    // Reader thread: parse output and emit events
    let event_name = format!("chat-event-{}", session_id);
    let sid_for_reader = session_id.clone();
    std::thread::spawn(move || {
        let mut buf = [0u8; 8192];
        let mut accumulated = String::new();
        let mut last_emit = std::time::Instant::now();
        let mut claude_started = false;

        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let raw = String::from_utf8_lossy(&buf[..n]).to_string();
                    accumulated.push_str(&raw);

                    let clean = strip_ansi(&accumulated);

                    // Wait for claude to start (detect the first prompt)
                    if !claude_started {
                        if clean.contains(">") || clean.contains("❯") {
                            claude_started = true;
                            accumulated.clear();
                            let _ = app.emit(
                                &event_name,
                                ChatEvent {
                                    session_id: sid_for_reader.clone(),
                                    event_type: "waiting".to_string(),
                                    content: String::new(),
                                },
                            );
                        }
                        continue;
                    }

                    // Check for permission request
                    if let Some(perm_text) = detect_permission_request(&clean) {
                        let _ = app.emit(
                            &event_name,
                            ChatEvent {
                                session_id: sid_for_reader.clone(),
                                event_type: "permission".to_string(),
                                content: perm_text,
                            },
                        );
                        accumulated.clear();
                        continue;
                    }

                    // Emit text periodically (debounce)
                    if last_emit.elapsed() > std::time::Duration::from_millis(100) {
                        if !clean.trim().is_empty() {
                            let _ = app.emit(
                                &event_name,
                                ChatEvent {
                                    session_id: sid_for_reader.clone(),
                                    event_type: "text".to_string(),
                                    content: clean.clone(),
                                },
                            );
                        }
                        last_emit = std::time::Instant::now();
                    }

                    // Check if waiting for input (response complete)
                    if detect_waiting_for_input(&clean) {
                        // Emit final text
                        let final_clean = strip_ansi(&accumulated);
                        if !final_clean.trim().is_empty() {
                            let _ = app.emit(
                                &event_name,
                                ChatEvent {
                                    session_id: sid_for_reader.clone(),
                                    event_type: "done".to_string(),
                                    content: final_clean,
                                },
                            );
                        }
                        accumulated.clear();
                    }
                }
                Err(_) => break,
            }
        }
    });

    Ok(session_id)
}

#[tauri::command]
pub async fn chat_send(session_id: String, message: String) -> Result<(), String> {
    let mut sessions = CHAT_SESSIONS.lock().unwrap();
    if let Some(session) = sessions.get_mut(&session_id) {
        session
            .writer
            .write_all(format!("{}\n", message).as_bytes())
            .map_err(|e| format!("Write error: {}", e))?;
        session
            .writer
            .flush()
            .map_err(|e| format!("Flush error: {}", e))?;
        Ok(())
    } else {
        Err("Session not found".to_string())
    }
}

#[tauri::command]
pub async fn chat_approve(session_id: String, approved: bool) -> Result<(), String> {
    let mut sessions = CHAT_SESSIONS.lock().unwrap();
    if let Some(session) = sessions.get_mut(&session_id) {
        let response = if approved { "y\n" } else { "n\n" };
        session
            .writer
            .write_all(response.as_bytes())
            .map_err(|e| format!("Write error: {}", e))?;
        session
            .writer
            .flush()
            .map_err(|e| format!("Flush error: {}", e))?;
        Ok(())
    } else {
        Err("Session not found".to_string())
    }
}

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
