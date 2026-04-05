mod chat;
mod config;
mod dialog;
mod import_export;
mod launcher;
mod logs;
mod profiles;
pub mod ssh;
mod telegram;
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
            chat::chat_start,
            chat::chat_send,
            chat::chat_approve,
            chat::save_temp_image,
            config::read_config,
            config::read_dashboard_data,
            config::write_config,
            config::read_project_extras,
            config::read_agent_file,
            config::write_agent_file,
            config::delete_agent_file,
            config::toggle_plugin,
            config::health_check_mcp,
            dialog::pick_directory,
            import_export::export_config,
            import_export::import_config,
            launcher::open_folder,
            launcher::check_claude_installed,
            launcher::launch_claude_code,
            logs::read_session_logs,
            profiles::list_profiles,
            profiles::save_profile,
            profiles::load_profile,
            profiles::delete_profile,
            ssh::ssh_test_connection,
            ssh::ssh_read_config,
            ssh::ssh_write_config,
            ssh::ssh_list_files,
            telegram::telegram_start_bot,
            telegram::telegram_stop_bot,
            telegram::telegram_bot_status,
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
