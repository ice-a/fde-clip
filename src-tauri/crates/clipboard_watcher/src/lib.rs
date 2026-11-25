//! Cross-platform clipboard polling.
//!
//! `tauri-plugin-clipboard-manager` v2 exposes read/write only - no change
//! event. We poll on a dedicated thread because `read_text` must never run on
//! the main thread (it can deadlock on Linux).

use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::thread;
use std::time::Duration;

use serde::Serialize;
use tauri::{AppHandle, Emitter};
use tauri_plugin_clipboard_manager::ClipboardExt;

#[derive(Clone, Serialize)]
pub struct ClipboardChange {
    pub text: String,
    pub hash: u64,
}

/// Spawn the polling thread. Returns immediately; the thread lives as long as
/// the app does.
pub fn start(app: AppHandle, interval: Duration) {
    thread::spawn(move || {
        let mut last_hash: Option<u64> = None;
        loop {
            if let Ok(text) = app.clipboard().read_text() {
                if !text.trim().is_empty() {
                    let hash = hash_text(&text);
                    if Some(hash) != last_hash {
                        last_hash = Some(hash);
                        let _ = app.emit(
                            "clipboard://changed",
                            ClipboardChange {
                                text: text.clone(),
                                hash,
                            },
                        );
                    }
                }
            }
            thread::sleep(interval);
        }
    });
}

fn hash_text(text: &str) -> u64 {
    let mut hasher = DefaultHasher::new();
    text.hash(&mut hasher);
    hasher.finish()
}
