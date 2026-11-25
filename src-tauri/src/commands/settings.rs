use std::path::Path;

use tauri::State;

use crate::state::{save_settings, AppState, Settings};

#[tauri::command]
pub fn settings_get(state: State<'_, AppState>) -> Settings {
    state
        .settings
        .lock()
        .map(|guard| guard.clone())
        .unwrap_or_default()
}

#[tauri::command]
pub fn settings_update(settings: Settings, state: State<'_, AppState>) -> Result<(), String> {
    let path = state.settings_path.clone();
    save_settings(&path, &settings).map_err(|e| e.to_string())?;
    *state.settings.lock().map_err(|e| e.to_string())? = settings;
    Ok(())
}

#[tauri::command]
pub fn settings_reload_rules(path: Option<String>, state: State<'_, AppState>) -> Result<usize, String> {
    let sniffer = match path {
        Some(custom) => sniffer::Sniffer::reload(Path::new(&custom)).map_err(|e| e.to_string())?,
        None => sniffer::Sniffer::load_default().map_err(|e| e.to_string())?,
    };
    let count = sniffer.rule_count();
    *state.sniffer.lock().map_err(|e| e.to_string())? = sniffer;
    Ok(count)
}

#[tauri::command]
pub fn settings_data_dir(state: State<'_, AppState>) -> String {
    state
        .settings_path
        .parent()
        .map(|p| p.to_string_lossy().into_owned())
        .unwrap_or_default()
}

#[tauri::command]
pub fn settings_get_autostart(app: tauri::AppHandle) -> Result<bool, String> {
    #[cfg(not(mobile))]
    {
        use tauri_plugin_autostart::ManagerExt;
        app.autolaunch().is_enabled().map_err(|e| e.to_string())
    }
    #[cfg(mobile)]
    {
        let _ = app;
        Ok(false)
    }
}

#[tauri::command]
pub fn settings_set_autostart(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
    #[cfg(not(mobile))]
    {
        use tauri_plugin_autostart::ManagerExt;
        let autolaunch = app.autolaunch();
        if enabled {
            autolaunch.enable()
        } else {
            autolaunch.disable()
        }
        .map_err(|e| e.to_string())
    }
    #[cfg(mobile)]
    {
        let _ = (app, enabled);
        Ok(())
    }
}

#[tauri::command]
pub fn settings_background_permission(_state: State<'_, AppState>) -> bool {
    #[cfg(target_os = "android")]
    {
        let path = _state
            .settings_path
            .parent()
            .map(|parent| parent.join("accessibility_status.txt"));
        if let Some(path) = path {
            if let Ok(contents) = std::fs::read_to_string(path) {
                let mut lines = contents.lines();
                let enabled = lines.next() == Some("1");
                let heartbeat: i64 = lines
                    .next()
                    .and_then(|value| value.parse().ok())
                    .unwrap_or(0);
                let now = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs() as i64;
                return enabled && now - heartbeat < 300;
            }
        }
    }
    false
}

#[tauri::command]
pub fn settings_open_accessibility_settings(app: tauri::AppHandle) -> Result<(), String> {
    #[cfg(target_os = "android")]
    {
        use tauri_plugin_shell::ShellExt;
        app.shell()
            .open(
                "intent:#Intent;action=android.settings.ACCESSIBILITY_SETTINGS;end",
                None,
            )
            .map_err(|e| e.to_string())
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = app;
        Err("仅 Android 支持".into())
    }
}
