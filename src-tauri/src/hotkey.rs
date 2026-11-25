use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutEvent};

pub fn register(app: &AppHandle) -> Result<(), tauri_plugin_global_shortcut::Error> {
    let shortcuts = app.global_shortcut();

    shortcuts.on_shortcut("Control+Shift+V", |app, _shortcut, _event| {
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.show();
            let _ = window.set_focus();
        }
    })?;

    shortcuts.on_shortcut("Control+Shift+C", |app, _shortcut, _event: ShortcutEvent| {
        let _ = app.emit("hotkey://analyze", ());
    })?;

    Ok(())
}
