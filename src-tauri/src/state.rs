//! Managed application state + the shared scan runner (C1).

use crate::util::expand;
use serde::Serialize;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};
use toshokan_core::timefmt::{humanize_epoch, now_epoch};
use toshokan_core::{scanner, Config, Project};

pub struct AppState {
    pub config: Mutex<Config>,
    pub config_path: PathBuf,
    pub projects: Mutex<Vec<Project>>,
    pub last_refresh: Mutex<Option<i64>>, // epoch seconds of the last scan
}

impl AppState {
    pub fn new(config: Config, config_path: PathBuf) -> Self {
        AppState {
            config: Mutex::new(config),
            config_path,
            projects: Mutex::new(Vec::new()),
            last_refresh: Mutex::new(None),
        }
    }
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ScanProgress {
    pub root: String,
    pub found: u32,
    pub done: bool,
}

/// Scan the given root (or all configured roots), enrich, cache the result in
/// state, and emit `scan://progress`. Runs on a worker thread (never the UI thread).
pub fn run_scan(app: &AppHandle, root: Option<String>) {
    let state = app.state::<AppState>();
    let cfg = state.config.lock().unwrap().clone();
    let vault = cfg.vault_root.as_ref().map(|v| expand(v));

    let roots: Vec<String> = match root {
        Some(r) => vec![r],
        None => cfg.directories.iter().map(|d| d.path.clone()).collect(),
    };

    let mut all: Vec<Project> = Vec::new();
    for r in &roots {
        let found = scanner::scan_root(&expand(r), vault.as_deref());
        let _ = app.emit("scan://progress", ScanProgress { root: r.clone(), found: found.len() as u32, done: false });
        all.extend(found);
    }

    // Reassign a global sort_key across every root, most-recent first.
    all.sort_by(|a, b| b.last_opened_at.cmp(&a.last_opened_at).then(a.name.cmp(&b.name)));
    for (i, p) in all.iter_mut().enumerate() {
        p.sort_key = i as i64;
    }

    *state.projects.lock().unwrap() = all.clone();
    *state.last_refresh.lock().unwrap() = Some(now_epoch());
    let _ = app.emit("scan://progress", ScanProgress { root: String::new(), found: all.len() as u32, done: true });
}

/// Humanised time of the last scan, or "Never".
pub fn last_refresh_label(state: &AppState) -> String {
    match *state.last_refresh.lock().unwrap() {
        Some(secs) => humanize_epoch(secs, now_epoch()),
        None => "Never".to_string(),
    }
}
