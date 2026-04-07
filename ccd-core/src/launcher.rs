use std::process::Command;

/// Find the claude binary path. Returns the full path or "claude" as fallback.
pub fn find_claude_path() -> String {
    let common_paths = [
        dirs::home_dir().map(|h| h.join(".local/bin/claude")),
        dirs::home_dir().map(|h| h.join(".nvm/current/bin/claude")),
        Some(std::path::PathBuf::from("/usr/local/bin/claude")),
        Some(std::path::PathBuf::from("/opt/homebrew/bin/claude")),
    ];

    for path in common_paths.iter().flatten() {
        if path.exists() {
            return path.to_string_lossy().to_string();
        }
    }

    // Fallback: try sh -lc which
    if let Ok(output) = Command::new("sh").args(["-lc", "which claude"]).output() {
        if output.status.success() {
            let p = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !p.is_empty() {
                return p;
            }
        }
    }

    "claude".to_string()
}

pub async fn check_claude_installed() -> Result<bool, String> {
    let path = find_claude_path();
    Ok(path != "claude" || {
        // Last resort: try running it
        Command::new(&path).arg("--version").output().map(|o| o.status.success()).unwrap_or(false)
    })
}
