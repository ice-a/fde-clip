use std::path::{Path, PathBuf};
use std::sync::Mutex;

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    #[serde(default = "default_retention_days")]
    pub retention_days: i64,
    #[serde(default = "default_retention_max")]
    pub retention_max: i64,
    #[serde(default = "default_poll_interval")]
    pub poll_interval_ms: u64,
    #[serde(default = "default_true")]
    pub diagnostics_enabled: bool,
    #[serde(default)]
    pub mask_secrets_by_default: bool,
    #[serde(default = "default_true")]
    pub hide_on_close: bool,
}

fn default_retention_days() -> i64 {
    30
}
fn default_retention_max() -> i64 {
    2000
}
fn default_poll_interval() -> u64 {
    250
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            retention_days: default_retention_days(),
            retention_max: default_retention_max(),
            poll_interval_ms: default_poll_interval(),
            diagnostics_enabled: true,
            mask_secrets_by_default: false,
            hide_on_close: true,
        }
    }
}

pub struct AppState {
    pub vault: Mutex<vault::Vault>,
    pub sniffer: Mutex<sniffer::Sniffer>,
    pub settings: Mutex<Settings>,
    pub settings_path: PathBuf,
}

pub fn load_settings(path: &Path) -> Settings {
    if !path.exists() {
        return Settings::default();
    }
    std::fs::read_to_string(path)
        .ok()
        .and_then(|raw| serde_json::from_str::<Settings>(&raw).ok())
        .unwrap_or_default()
}

pub fn save_settings(path: &Path, settings: &Settings) -> Result<()> {
    let raw = serde_json::to_string_pretty(settings).context("cannot serialize settings")?;
    std::fs::write(path, raw).with_context(|| format!("cannot write {}", path.display()))
}
