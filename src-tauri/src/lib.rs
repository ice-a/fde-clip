mod commands;
#[cfg(not(mobile))]
mod hotkey;
mod state;
#[cfg(not(mobile))]
mod tray;

use std::sync::Mutex;
use std::time::Duration;

use tauri::Manager;
#[cfg(not(mobile))]
use tauri::WindowEvent;

use crate::state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_shell::init());

    #[cfg(not(mobile))]
    let builder = builder
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build());

    builder
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

            #[cfg(not(mobile))]
            {
                tray::create(app.handle())?;
                hotkey::register(app.handle());
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
            }

            clipboard_watcher::start(app.handle().clone(), data_dir, Duration::from_millis(interval_ms));
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
            commands::settings::settings_get,
            commands::settings::settings_update,
            commands::settings::settings_reload_rules,
            commands::settings::settings_data_dir,
            commands::settings::settings_get_autostart,
            commands::settings::settings_set_autostart,
            commands::settings::settings_background_permission,
            commands::settings::settings_open_accessibility_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running fde-clip");
}
