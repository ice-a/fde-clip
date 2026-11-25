use regex::Regex;
use sniffer::Diagnosis;
use tauri::{AppHandle, State};
use tauri_plugin_clipboard_manager::ClipboardExt;
use vault::Clip;

use crate::state::AppState;

#[tauri::command]
pub fn clipboard_ingest(text: String, state: State<'_, AppState>) -> Result<Clip, String> {
    let (enabled, days, max) = {
        let settings = state.settings.lock().map_err(|e| e.to_string())?;
        (
            settings.diagnostics_enabled,
            settings.retention_days,
            settings.retention_max,
        )
    };

    let diagnosis = if enabled {
        state
            .sniffer
            .lock()
            .map_err(|e| e.to_string())?
            .diagnose(&text)
    } else {
        Diagnosis {
            kind: "text".into(),
            findings: Vec::new(),
            elapsed_ms: 0,
        }
    };

    let clip = state
        .vault
        .lock()
        .map_err(|e| e.to_string())?
        .insert(&text, diagnosis)
        .map_err(|e| e.to_string())?;

    if let Ok(store) = state.vault.lock() {
        let _ = store.prune(days, max);
    }
    Ok(clip)
}

#[tauri::command]
pub fn clipboard_list(limit: i64, state: State<'_, AppState>) -> Result<Vec<Clip>, String> {
    state
        .vault
        .lock()
        .map_err(|e| e.to_string())?
        .list(limit)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn clipboard_search(
    query: String,
    use_regex: bool,
    limit: i64,
    state: State<'_, AppState>,
) -> Result<Vec<Clip>, String> {
    if use_regex {
        let pattern = Regex::new(&query).map_err(|e| format!("正则无效：{}", e))?;
        let all = state
            .vault
            .lock()
            .map_err(|e| e.to_string())?
            .list(1000.max(limit))
            .map_err(|e| e.to_string())?;
        Ok(all
            .into_iter()
            .filter(|clip| pattern.is_match(&clip.content))
            .take(limit as usize)
            .collect())
    } else {
        state
            .vault
            .lock()
            .map_err(|e| e.to_string())?
            .search(&query, limit)
            .map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn clipboard_pin(id: String, pinned: bool, state: State<'_, AppState>) -> Result<(), String> {
    state
        .vault
        .lock()
        .map_err(|e| e.to_string())?
        .set_pin(&id, pinned)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn clipboard_delete(id: String, state: State<'_, AppState>) -> Result<(), String> {
    state
        .vault
        .lock()
        .map_err(|e| e.to_string())?
        .delete(&id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn clipboard_copy(text: String, app: AppHandle) -> Result<(), String> {
    // Runs on a Tauri worker thread, never on the main thread (Linux deadlock risk).
    app.clipboard()
        .write_text(text)
        .map_err(|e| e.to_string())
}
