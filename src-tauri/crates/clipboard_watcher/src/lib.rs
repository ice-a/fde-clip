//! Cross-platform clipboard polling.
//!
//! Desktop: `tauri-plugin-clipboard-manager` v2 exposes read/write only - no
//! change event. We poll on a dedicated thread because `read_text` must never
//! run on the main thread (it can deadlock on Linux).
//!
//! Android: the OS only allows the foreground app (or default IME) to read the
//! clipboard. A user-enabled accessibility service writes the latest text into
//! `clipboard_latest.txt`; this thread watches that file instead.

use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use std::path::PathBuf;
use std::thread;
use std::time::Duration;

#[cfg(target_os = "android")]
use base64::Engine;
use serde::Serialize;
use tauri::{AppHandle, Emitter};
#[cfg(not(target_os = "android"))]
use tauri_plugin_clipboard_manager::ClipboardExt;
#[derive(Clone, Serialize)]
pub struct ClipboardChange {
    pub text: String,
    pub hash: u64,
}

/// Spawn the polling thread. Returns immediately; the thread lives as long as
/// the app does.
pub fn start(app: AppHandle, _data_dir: PathBuf, interval: Duration) {
    #[cfg(target_os = "android")]
    {
        thread::spawn(move || android_poll(app, _data_dir, interval));
        return;
    }

    #[cfg(not(target_os = "android"))]
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

#[cfg(target_os = "android")]
fn android_poll(app: AppHandle, data_dir: PathBuf, interval: Duration) {
    let path = data_dir.join("clipboard_latest.txt");
    let mut last: Option<String> = None;
    loop {
        if let Ok(contents) = std::fs::read_to_string(&path) {
            let encoded = contents.lines().next().unwrap_or("").trim();
            if !encoded.is_empty() && Some(encoded) != last.as_deref() {
                if let Ok(bytes) = base64::engine::general_purpose::STANDARD.decode(encoded) {
                    if let Ok(text) = String::from_utf8(bytes) {
                        if !text.trim().is_empty() {
                            last = Some(encoded.to_string());
                            let _ = app.emit(
                                "clipboard://changed",
                                ClipboardChange {
                                    text: text.clone(),
                                    hash: hash_text(&text),
                                },
                            );
                        }
                    }
                }
            }
        }
        thread::sleep(interval);
    }
}

fn hash_text(text: &str) -> u64 {
    let mut hasher = DefaultHasher::new();
    text.hash(&mut hasher);
    hasher.finish()
}
