use std::io::Write;
use std::process::{Command, Stdio};

#[derive(serde::Serialize)]
pub struct VerificationResult {
    pub output: String,
    pub success: bool,
    pub duration_ms: u64,
}

#[tauri::command]
pub async fn run_verification(
    prompt: String,
    project_path: Option<String>,
) -> Result<VerificationResult, String> {
    let start = std::time::Instant::now();

    let mut cmd = Command::new("claude");
    cmd.args(["--print"]);
    if let Some(ref path) = project_path {
        cmd.current_dir(path);
    }
    cmd.stdin(Stdio::piped());
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| format!("Spawn error: {}", e))?;
    if let Some(mut stdin) = child.stdin.take() {
        let _ = stdin.write_all(prompt.as_bytes());
        drop(stdin);
    }

    let output = child
        .wait_with_output()
        .map_err(|e| format!("Wait error: {}", e))?;
    let duration = start.elapsed().as_millis() as u64;
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let success = output.status.success()
        && !stdout.to_lowercase().contains("fail")
        && !stdout.to_lowercase().contains("error");

    Ok(VerificationResult {
        output: stdout,
        success,
        duration_ms: duration,
    })
}
