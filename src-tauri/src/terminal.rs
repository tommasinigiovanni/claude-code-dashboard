use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Mutex;
#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;
use tauri::{AppHandle, Emitter};

struct PtySession {
    writer: Box<dyn Write + Send>,
    master: Box<dyn MasterPty + Send>,
}

static SESSIONS: once_cell::sync::Lazy<Mutex<HashMap<String, PtySession>>> =
    once_cell::sync::Lazy::new(|| Mutex::new(HashMap::new()));

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TmuxSession {
    pub name: String,
    pub attached: bool,
    pub windows: u32,
    pub created: String,
}

fn sanitize_session_name(path: &str) -> String {
    let name = path
        .split('/')
        .filter(|s| !s.is_empty())
        .last()
        .unwrap_or("default");
    format!("claude-{}", name.replace('.', "_").replace(':', "_"))
}

#[tauri::command]
pub async fn tmux_list_sessions() -> Result<Vec<TmuxSession>, String> {
    let output = std::process::Command::new("tmux")
        .args(["list-sessions", "-F", "#{session_name}|#{session_attached}|#{session_windows}|#{session_created_string}"])
        .output();

    match output {
        Ok(out) if out.status.success() => {
            let stdout = String::from_utf8_lossy(&out.stdout);
            let sessions: Vec<TmuxSession> = stdout
                .lines()
                .filter(|l| l.starts_with("claude-"))
                .filter_map(|line| {
                    let parts: Vec<&str> = line.splitn(4, '|').collect();
                    if parts.len() >= 4 {
                        Some(TmuxSession {
                            name: parts[0].to_string(),
                            attached: parts[1] == "1",
                            windows: parts[2].parse().unwrap_or(1),
                            created: parts[3].to_string(),
                        })
                    } else {
                        None
                    }
                })
                .collect();
            Ok(sessions)
        }
        _ => Ok(Vec::new()),
    }
}

#[tauri::command]
pub async fn tmux_session_cwd(session_name: String) -> Result<Option<String>, String> {
    let output = std::process::Command::new("tmux")
        .args(["display-message", "-t", &session_name, "-p", "#{pane_current_path}"])
        .output()
        .map_err(|e| format!("Failed to get cwd: {}", e))?;

    if output.status.success() {
        let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if path.is_empty() {
            Ok(None)
        } else {
            Ok(Some(path))
        }
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn tmux_kill_session(session_name: String) -> Result<(), String> {
    std::process::Command::new("tmux")
        .args(["kill-session", "-t", &session_name])
        .output()
        .map_err(|e| format!("Failed to kill session: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn terminal_spawn(
    app: AppHandle,
    project_path: Option<String>,
    use_tmux: Option<bool>,
    tmux_attach_session: Option<String>,
    ssh_config: Option<crate::ssh::SshConfig>,
) -> Result<String, String> {
    let session_id = uuid::Uuid::new_v4().to_string();
    let pty_system = native_pty_system();
    let use_tmux = use_tmux.unwrap_or(false);

    let pair = pty_system
        .openpty(PtySize {
            rows: 30,
            cols: 120,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Failed to open PTY: {}", e))?;

    // Start a shell, then run commands inside it
    // This ensures proper env setup (PATH, etc.)
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".to_string());
    let mut cmd = CommandBuilder::new(&shell);
    cmd.env("TERM", "xterm-256color");

    if let Some(ref path) = project_path {
        cmd.cwd(path);
    }

    let _child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("Failed to spawn shell: {}", e))?;

    drop(pair.slave);

    let writer = pair
        .master
        .take_writer()
        .map_err(|e| format!("Failed to get writer: {}", e))?;

    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| format!("Failed to get reader: {}", e))?;

    let sid = session_id.clone();
    SESSIONS.lock().unwrap().insert(
        sid.clone(),
        PtySession {
            writer,
            master: pair.master,
        },
    );

    // Forward PTY output to frontend
    let event_name = format!("terminal-output-{}", session_id);
    std::thread::spawn(move || {
        let mut buf = [0u8; 8192];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buf[..n]).to_string();
                    let _ = app.emit(&event_name, data);
                }
                Err(_) => break,
            }
        }
    });

    // After shell starts, send the command to run claude (or tmux + claude)
    let sid_clone = session_id.clone();
    let project_path_clone = project_path.clone();
    let tmux_attach = tmux_attach_session.clone();
    let ssh_cfg = ssh_config.clone();
    std::thread::spawn(move || {
        // Wait for shell prompt
        std::thread::sleep(std::time::Duration::from_millis(500));

        // If SSH, connect first
        if let Some(ref cfg) = ssh_cfg {
            let ssh_cmd = crate::ssh::get_ssh_command(cfg);
            {
                let mut s = SESSIONS.lock().unwrap();
                if let Some(session) = s.get_mut(&sid_clone) {
                    let _ = session.writer.write_all(format!("{}\n", ssh_cmd).as_bytes());
                    let _ = session.writer.flush();
                }
            }
            // Wait for SSH connection
            std::thread::sleep(std::time::Duration::from_millis(2000));

            // cd to project if specified
            if let Some(ref path) = project_path_clone {
                let mut s = SESSIONS.lock().unwrap();
                if let Some(session) = s.get_mut(&sid_clone) {
                    let _ = session.writer.write_all(format!("cd '{}'\n", path).as_bytes());
                    let _ = session.writer.flush();
                }
                drop(s);
                std::thread::sleep(std::time::Duration::from_millis(300));
            }
        }

        let mut sessions = SESSIONS.lock().unwrap();
        if let Some(session) = sessions.get_mut(&sid_clone) {
            // For SSH remote, use simple commands (tmux check is remote)
            let is_remote = ssh_cfg.is_some();

            let command = if let Some(ref attach_name) = tmux_attach {
                format!("tmux attach-session -t {}\n", attach_name)
            } else if use_tmux {
                let sess_name = project_path_clone
                    .as_deref()
                    .map(sanitize_session_name)
                    .unwrap_or_else(|| "claude-default".to_string());

                if is_remote {
                    // For SSH: check remote tmux, use inline commands
                    format!(
                        "tmux has-session -t {} 2>/dev/null && tmux attach-session -t {} || (tmux new-session -d -s {} && tmux split-window -t {} -v -p 30 && tmux send-keys -t {}:0.0 'claude' Enter && tmux set -t {} mouse on && tmux attach-session -t {})\n",
                        sess_name, sess_name, sess_name, sess_name, sess_name, sess_name, sess_name
                    )
                } else {
                    // Local: check with local command
                    let exists = std::process::Command::new("tmux")
                        .args(["has-session", "-t", &sess_name])
                        .output()
                        .map(|o| o.status.success())
                        .unwrap_or(false);

                if exists {
                    format!("tmux attach-session -t {}\n", sess_name)
                } else {
                    // Create tmux session via a temp script to avoid long command line
                    let script = r##"#!/bin/sh
S=__SESS__
tmux new-session -d -s $S
tmux split-window -t $S -v -p 30
tmux select-pane -t $S:0.0
tmux send-keys -t $S:0.0 'claude' Enter
tmux set -t $S mouse on
tmux set -t $S pane-border-style 'fg=colour240'
tmux set -t $S pane-active-border-style 'fg=colour141,bold'
tmux set -t $S pane-border-lines heavy
tmux set -t $S status-style 'fg=colour245,bg=colour236'
tmux set -t $S status-left '#[fg=colour141,bold] $S #[fg=colour245]│ '
tmux set -t $S status-right '#[fg=colour93,bold] ↕ drag border to resize #[fg=colour245]│ click pane to switch '
tmux select-pane -t $S:0.1 -P 'fg=colour46,bg=colour16'
tmux select-pane -t $S:0.0
tmux attach-session -t $S
"##.replace("__SESS__", &sess_name);
                    let script_path = std::env::temp_dir().join(format!("tmux-{}.sh", sess_name));
                    let _ = std::fs::write(&script_path, &script);
                    #[cfg(unix)]
                    {
                        let _ = std::fs::set_permissions(
                            &script_path,
                            std::fs::Permissions::from_mode(0o755),
                        );
                    }
                    format!("{}\n", script_path.display())
                }
                }
            } else {
                "claude\n".to_string()
            };

            let _ = session.writer.write_all(command.as_bytes());
            let _ = session.writer.flush();
        }
    });

    Ok(session_id)
}

#[tauri::command]
pub async fn terminal_write(session_id: String, data: String) -> Result<(), String> {
    let mut sessions = SESSIONS.lock().unwrap();
    if let Some(session) = sessions.get_mut(&session_id) {
        session
            .writer
            .write_all(data.as_bytes())
            .map_err(|e| format!("Write error: {}", e))?;
        session
            .writer
            .flush()
            .map_err(|e| format!("Flush error: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub async fn terminal_resize(session_id: String, rows: u16, cols: u16) -> Result<(), String> {
    let sessions = SESSIONS.lock().unwrap();
    if let Some(session) = sessions.get(&session_id) {
        session
            .master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("Resize error: {}", e))?;
    }
    Ok(())
}
