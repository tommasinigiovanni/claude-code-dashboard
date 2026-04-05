use serde::{Deserialize, Serialize};
use std::process::{Command, Stdio};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SshConfig {
    pub name: String,
    pub host: String,
    pub port: u16,
    pub user: String,
    pub key_path: Option<String>,  // path to SSH key, None = use default
}

fn build_ssh_args(config: &SshConfig) -> Vec<String> {
    let mut args = vec![
        "-o".to_string(), "StrictHostKeyChecking=no".to_string(),
        "-o".to_string(), "ConnectTimeout=10".to_string(),
        "-p".to_string(), config.port.to_string(),
    ];
    if let Some(ref key) = config.key_path {
        args.push("-i".to_string());
        args.push(key.clone());
    }
    args.push(format!("{}@{}", config.user, config.host));
    args
}

#[tauri::command]
pub async fn ssh_test_connection(config: SshConfig) -> Result<String, String> {
    let mut args = build_ssh_args(&config);
    args.push("echo 'SSH_OK' && claude --version 2>/dev/null || echo 'CLAUDE_NOT_FOUND'".to_string());

    let output = Command::new("ssh")
        .args(&args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| format!("SSH error: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("SSH connection failed: {}", stderr.trim()));
    }

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if stdout.contains("SSH_OK") {
        if stdout.contains("CLAUDE_NOT_FOUND") {
            Ok("connected_no_claude".to_string())
        } else {
            Ok(format!("connected:{}", stdout.lines().last().unwrap_or("unknown")))
        }
    } else {
        Err("SSH connection failed".to_string())
    }
}

#[tauri::command]
pub async fn ssh_read_config(config: SshConfig, remote_path: String) -> Result<String, String> {
    let mut args = build_ssh_args(&config);
    args.push(format!("cat '{}' 2>/dev/null || echo '{{}}'", remote_path));

    let output = Command::new("ssh")
        .args(&args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| format!("SSH error: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        Err(format!("SSH read error: {}", String::from_utf8_lossy(&output.stderr)))
    }
}

#[tauri::command]
pub async fn ssh_write_config(config: SshConfig, remote_path: String, content: String) -> Result<(), String> {
    let mut args = build_ssh_args(&config);
    // Backup + write via heredoc
    let cmd = format!(
        "mkdir -p $(dirname '{}') && cp '{}' '{}.bak' 2>/dev/null; cat > '{}'",
        remote_path, remote_path, remote_path, remote_path
    );
    args.push(cmd);

    let mut child = Command::new("ssh")
        .args(&args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("SSH error: {}", e))?;

    if let Some(mut stdin) = child.stdin.take() {
        use std::io::Write;
        stdin.write_all(content.as_bytes()).map_err(|e| format!("Write error: {}", e))?;
        drop(stdin);
    }

    let output = child.wait_with_output().map_err(|e| format!("Wait error: {}", e))?;
    if output.status.success() {
        Ok(())
    } else {
        Err(format!("SSH write error: {}", String::from_utf8_lossy(&output.stderr)))
    }
}

#[tauri::command]
pub async fn ssh_list_files(config: SshConfig, remote_dir: String, pattern: String) -> Result<Vec<String>, String> {
    let mut args = build_ssh_args(&config);
    args.push(format!("find '{}' -name '{}' -type f 2>/dev/null", remote_dir, pattern));

    let output = Command::new("ssh")
        .args(&args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| format!("SSH error: {}", e))?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        Ok(stdout.lines().filter(|l| !l.is_empty()).map(|l| l.to_string()).collect())
    } else {
        Ok(Vec::new())
    }
}

/// Returns the SSH command string for use in PTY (terminal/chat)
pub fn get_ssh_command(config: &SshConfig) -> String {
    let mut parts = vec!["ssh".to_string()];
    parts.push("-o".to_string());
    parts.push("StrictHostKeyChecking=no".to_string());
    parts.push("-p".to_string());
    parts.push(config.port.to_string());
    if let Some(ref key) = config.key_path {
        parts.push("-i".to_string());
        parts.push(key.clone());
    }
    parts.push("-t".to_string()); // Force TTY for interactive use
    parts.push(format!("{}@{}", config.user, config.host));
    parts.join(" ")
}
