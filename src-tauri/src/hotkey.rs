use tauri::{AppHandle, Manager};
use tauri_plugin_global_shortcut::GlobalShortcutExt;

pub fn register(app: &AppHandle) {
    let shortcuts = app.global_shortcut();
    // Another instance may already own the shortcut; the tray icon still works.
    let _ = shortcuts.on_shortcut("Control+Shift+V", |app, _shortcut, _event| {
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.show();
            let _ = window.set_focus();
        }
    });
}
