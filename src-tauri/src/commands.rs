//! Tauri command surface — thin wrappers over toshokan-core.
//! Phase 2 implements C2 (git/stack), C3 (summary/notes), C4 (fsview).
//! Phases 1/3/4 add discovery, the supervisor, system actions, and updates.

use std::path::PathBuf;
use toshokan_core::model::{FilePreview, GitInfo, Summary, TreeNode};
use toshokan_core::{fsview, meta, summary};

/// Expand a leading `~` to the user's home directory; otherwise pass through.
fn expand(path: &str) -> PathBuf {
    if let Some(rest) = path.strip_prefix("~/").or_else(|| path.strip_prefix("~")) {
        if let Some(home) = home_dir() {
            return home.join(rest.trim_start_matches('/'));
        }
    }
    PathBuf::from(path)
}

fn home_dir() -> Option<PathBuf> {
    std::env::var_os("HOME")
        .or_else(|| std::env::var_os("USERPROFILE"))
        .map(PathBuf::from)
}

#[tauri::command]
pub fn git_info(path: String) -> Option<GitInfo> {
    meta::git_info(&expand(&path))
}

#[tauri::command]
pub fn detect_stack(path: String) -> Vec<String> {
    meta::detect_stack(&expand(&path))
}

#[tauri::command]
pub fn list_dir(path: String) -> Result<Vec<TreeNode>, String> {
    fsview::list_dir(&expand(&path)).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn preview_file(path: String, max_lines: Option<usize>) -> Option<FilePreview> {
    fsview::preview_file(&expand(&path), max_lines)
}

#[tauri::command]
pub fn get_summary(path: String, name: String, vault_root: Option<String>) -> Option<Summary> {
    let vault = vault_root.map(|v| expand(&v));
    summary::resolve_summary(&expand(&path), &name, vault.as_deref())
}
