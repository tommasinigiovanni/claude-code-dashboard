pub use ccd_core::profiles::Profile;

#[tauri::command]
pub async fn list_profiles() -> Result<Vec<Profile>, String> {
    ccd_core::profiles::list_profiles().await
}

#[tauri::command]
pub async fn save_profile(name: String, description: String) -> Result<(), String> {
    ccd_core::profiles::save_profile(name, description).await
}

#[tauri::command]
pub async fn load_profile(name: String) -> Result<(), String> {
    ccd_core::profiles::load_profile(name).await
}

#[tauri::command]
pub async fn delete_profile(name: String) -> Result<(), String> {
    ccd_core::profiles::delete_profile(name).await
}
