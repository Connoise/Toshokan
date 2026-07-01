//! Small shared helpers for the tauri layer.

use std::path::PathBuf;

/// Expand a leading `~` to the user's home directory; otherwise pass through.
pub fn expand(path: &str) -> PathBuf {
    if let Some(rest) = path.strip_prefix("~/").or_else(|| path.strip_prefix('~')) {
        if let Some(home) = home_dir() {
            return home.join(rest.trim_start_matches('/'));
        }
    }
    PathBuf::from(path)
}

pub fn home_dir() -> Option<PathBuf> {
    std::env::var_os("HOME")
        .or_else(|| std::env::var_os("USERPROFILE"))
        .map(PathBuf::from)
}
