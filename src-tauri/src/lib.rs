mod commands;
mod hotkey;
mod state;
mod tray;

use std::sync::Mutex;
use std::time::Duration;
use tauri::{Manager, WindowEvent};
use crate::state::AppState;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(|app| {
            let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
            std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
            let settings_path = data_dir.join("settings.json");
            let settings = state::load_settings(&settings_path);
            let interval_ms = settings.poll_interval_ms;
            let vault = vault::Vault::open(data_dir.join("vault.db")).map_err(|e| e.to_string())?;
            let sniffer = sniffer::Sniffer::load_default().map_err(|e| e.to_string())?;

            app.manage(AppState {
                vault: Mutex::new(vault),
                sniffer: Mutex::new(sniffer),
                settings: Mutex::new(settings),
                settings_path,
            });

            tray::create(app.handle())?;
            hotkey::register(app.handle())?;
            clipboard_watcher::start(app.handle().clone(), Duration::from_millis(interval_ms));
            if let Some(window) = app.get_webview_window("main") {
                let handle = app.handle().clone();
                let hidden_window = window.clone();
                window.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        let hide_on_close = handle
                            .state::<AppState>()
                            .settings
                            .lock()
                            .map(|settings| settings.hide_on_close)
                            .unwrap_or(true);
                        if hide_on_close {
                            api.prevent_close();
                            let _ = hidden_window.hide();
                        }
                    }
                });
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::clipboard::clipboard_ingest,
            commands::clipboard::clipboard_list,
            commands::clipboard::clipboard_search,
            commands::clipboard::clipboard_pin,
            commands::clipboard::clipboard_delete,
            commands::clipboard::clipboard_copy,
            commands::vault::vault_stats,
            commands::vault::vault_prune,
            commands::chef::chef_run,
            commands::chef::chef_builtin_recipes,
            commands::chef::chef_stream_file,
            commands::ai::ai_stream,
            commands::settings::settings_get,
            commands::settings::settings_update,
            commands::settings::settings_set_key,
            commands::settings::settings_has_key,
            commands::settings::settings_reload_rules,
            commands::settings::settings_data_dir,
            commands::settings::settings_get_autostart,
            commands::settings::settings_set_autostart,
        ])
        .run(tauri::generate_context!())
        .expect("error while running fde-clip");
}
