use std::path::PathBuf;
use std::process::Command;

pub use ccd_core::launcher::find_claude_path;

#[tauri::command]
pub async fn open_folder(path: String) -> Result<(), String> {
    let folder = PathBuf::from(&path);
    let dir = if folder.is_file() {
        folder.parent().unwrap_or(&folder).to_path_buf()
    } else {
        folder
    };

    if !dir.exists() {
        return Err(format!("Directory not found: {}", dir.display()));
    }

    #[cfg(target_os = "macos")]
    Command::new("open")
        .arg(&dir)
        .spawn()
        .map_err(|e| format!("Failed to open folder: {}", e))?;

    #[cfg(target_os = "windows")]
    Command::new("explorer")
        .arg(&dir)
        .spawn()
        .map_err(|e| format!("Failed to open folder: {}", e))?;

    #[cfg(target_os = "linux")]
    Command::new("xdg-open")
        .arg(&dir)
        .spawn()
        .map_err(|e| format!("Failed to open folder: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn check_claude_installed() -> Result<bool, String> {
    ccd_core::launcher::check_claude_installed().await
}

#[tauri::command]
pub async fn launch_claude_code(
    project_path: Option<String>,
    terminal_app: Option<String>,
) -> Result<(), String> {
    let claude_cmd = find_claude_path();
    let terminal = terminal_app.unwrap_or_else(|| "Terminal".to_string());

    #[cfg(target_os = "macos")]
    {
        let dir = project_path.unwrap_or_else(|| ".".to_string());

        let script = match terminal.as_str() {
            "iTerm" => format!(
                r#"tell application "iTerm"
    activate
    set newWindow to (create window with default profile)
    tell current session of newWindow
        write text "cd '{}' && {}"
    end tell
end tell"#,
                dir, claude_cmd
            ),
            "Warp" => format!(
                r#"tell application "Warp"
    activate
end tell
delay 0.5
tell application "System Events"
    keystroke "t" using command down
end tell
delay 0.3
tell application "System Events"
    keystroke "cd '{}' && {}"
    key code 36
end tell"#,
                dir, claude_cmd
            ),
            _ => format!(
                r#"tell application "{}"
    activate
    do script "cd '{}' && {}"
end tell"#,
                terminal, dir, claude_cmd
            ),
        };

        Command::new("osascript")
            .arg("-e")
            .arg(&script)
            .spawn()
            .map(|_| ())
            .map_err(|e| format!("Failed to launch claude in {}: {}", terminal, e))?;
    }

    #[cfg(not(target_os = "macos"))]
    {
        let mut cmd = Command::new(claude_cmd);
        if let Some(ref path) = project_path {
            cmd.current_dir(path);
        }
        cmd.spawn()
            .map(|_| ())
            .map_err(|e| format!("Failed to launch claude: {}", e))?;
    }

    Ok(())
}
