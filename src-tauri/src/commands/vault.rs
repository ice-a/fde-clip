use tauri::State;

use crate::state::AppState;

#[tauri::command]
pub fn vault_stats(state: State<'_, AppState>) -> Result<(i64, i64), String> {
    state
        .vault
        .lock()
        .map_err(|e| e.to_string())?
        .stats()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn vault_prune(state: State<'_, AppState>) -> Result<u64, String> {
    let (days, max) = {
        let settings = state.settings.lock().map_err(|e| e.to_string())?;
        (settings.retention_days, settings.retention_max)
    };
    state
        .vault
        .lock()
        .map_err(|e| e.to_string())?
        .prune(days, max)
        .map_err(|e| e.to_string())
}
