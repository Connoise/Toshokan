//! toshokan-core — pure, tauri-free logic for project enrichment.
//!
//! Kept independent of `tauri` so it compiles and unit-tests without a system
//! WebView, and so a future mobile build can reuse it. The tauri binary crate
//! wraps these functions as `#[tauri::command]`s (see ../src/commands.rs).

pub mod config;
pub mod fsview;
pub mod meta;
pub mod model;
pub mod scanner;
pub mod summary;
pub mod timefmt;

pub use config::Config;
pub use model::{CommitInfo, FilePreview, GitInfo, NodeType, Project, Subproject, Summary, TreeNode};
