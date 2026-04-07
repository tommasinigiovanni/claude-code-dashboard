pub use ccd_core::verification::VerificationResult;

#[tauri::command]
pub async fn run_verification(
    prompt: String,
    project_path: Option<String>,
) -> Result<VerificationResult, String> {
    ccd_core::verification::run_verification(prompt, project_path).await
}
