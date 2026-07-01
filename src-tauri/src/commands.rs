//! Tauri command surface — thin wrappers over toshokan-core + app state.
//! Phase 1: discovery (C1) + config (C8). Phase 2: git/stack (C2), notes (C3),
//! fsview (C4). Phases 3/4 add the supervisor, system actions, and updates.

use crate::state::{last_refresh_label, run_scan, AppState};
use crate::util::expand;
use tauri::{AppHandle, State};
use toshokan_core::config as cfg;
use toshokan_core::model::{FilePreview, GitInfo, Summary, TreeNode};
use toshokan_core::{fsview, meta, scanner, summary, Config, Project};

// ---- C1 · discovery ---------------------------------------------------------

#[tauri::command]
pub fn list_projects(state: State<AppState>) -> Vec<Project> {
    state.projects.lock().unwrap().clone()
}

#[tauri::command]
pub fn rescan(app: AppHandle, root: Option<String>) {
    run_scan(&app, root);
}

#[tauri::command]
pub fn last_refresh(state: State<AppState>) -> String {
    last_refresh_label(&state)
}

/// Discover projects under an arbitrary root without touching cached state
/// (used by settings previews / one-off scans).
#[tauri::command]
pub fn scan_dir(path: String, vault_root: Option<String>) -> Vec<Project> {
    let vault = vault_root.map(|v| expand(&v));
    scanner::scan_root(&expand(&path), vault.as_deref())
}

// ---- C8 · config ------------------------------------------------------------

#[tauri::command]
pub fn get_config(state: State<AppState>) -> Config {
    state.config.lock().unwrap().clone()
}

/// Deep-merge a partial patch into the current config, persist it, and (when the
/// watched directories or vault changed) trigger a rescan.
#[tauri::command]
pub fn patch_config(app: AppHandle, state: State<AppState>, patch: serde_json::Value) -> Config {
    let (next, roots_changed) = {
        let mut guard = state.config.lock().unwrap();
        let before = guard.clone();
        let mut value = serde_json::to_value(&*guard).unwrap_or(serde_json::Value::Null);
        merge(&mut value, &patch);
        if let Ok(parsed) = serde_json::from_value::<Config>(value) {
            *guard = parsed;
        }
        let changed = guard.directories != before.directories || guard.vault_root != before.vault_root;
        (guard.clone(), changed)
    };
    let _ = cfg::save(&state.config_path, &next);
    if roots_changed {
        let app2 = app.clone();
        std::thread::spawn(move || run_scan(&app2, None));
    }
    next
}

/// Recursive JSON object merge (patch wins; objects merged, other values replaced).
fn merge(base: &mut serde_json::Value, patch: &serde_json::Value) {
    match (base, patch) {
        (serde_json::Value::Object(b), serde_json::Value::Object(p)) => {
            for (k, v) in p {
                merge(b.entry(k.clone()).or_insert(serde_json::Value::Null), v);
            }
        }
        (b, p) => *b = p.clone(),
    }
}

// ---- C2 · git / stack -------------------------------------------------------

#[tauri::command]
pub fn git_info(path: String) -> Option<GitInfo> {
    meta::git_info(&expand(&path))
}

#[tauri::command]
pub fn detect_stack(path: String) -> Vec<String> {
    meta::detect_stack(&expand(&path))
}

// ---- C4 · filesystem cross-section -----------------------------------------

#[tauri::command]
pub fn list_dir(path: String) -> Result<Vec<TreeNode>, String> {
    fsview::list_dir(&expand(&path)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn preview_file(path: String, max_lines: Option<usize>) -> Option<FilePreview> {
    fsview::preview_file(&expand(&path), max_lines)
}

// ---- C3 · summary / notes ---------------------------------------------------

#[tauri::command]
pub fn get_summary(path: String, name: String, vault_root: Option<String>) -> Option<Summary> {
    let vault = vault_root.map(|v| expand(&v));
    summary::resolve_summary(&expand(&path), &name, vault.as_deref())
}
