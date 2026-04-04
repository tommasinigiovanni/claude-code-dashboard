mod chat;
mod config;
mod dialog;
mod launcher;
mod terminal;
mod tray;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            tray::setup_tray(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            chat::chat_send_message,
            chat::save_temp_image,
            config::read_config,
            config::read_dashboard_data,
            config::write_config,
            config::read_project_extras,
            config::read_agent_file,
            config::write_agent_file,
            config::delete_agent_file,
            config::toggle_plugin,
            dialog::pick_directory,
            launcher::open_folder,
            launcher::check_claude_installed,
            launcher::launch_claude_code,
            terminal::terminal_spawn,
            terminal::terminal_write,
            terminal::terminal_resize,
            terminal::tmux_list_sessions,
            terminal::tmux_session_cwd,
            terminal::tmux_kill_session,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
