//! toshokan-core — pure, tauri-free logic for project enrichment.
//!
//! Kept independent of `tauri` so it compiles and unit-tests without a system
//! WebView, and so a future mobile build can reuse it. The tauri binary crate
//! wraps these functions as `#[tauri::command]`s (see ../src/commands.rs).

pub mod config;
pub mod envfile;
pub mod fsview;
pub mod logparse;
pub mod manifest;
pub mod meta;
pub mod model;
pub mod scanner;
pub mod schedule;
pub mod summary;
pub mod supervisor;
pub mod timefmt;

pub use config::Config;
pub use model::{
    CommitInfo, FilePreview, GitInfo, LogLine, LogSeverity, NodeType, Project, ServiceError,
    ServiceKind, ServiceState, Subproject, Summary, TreeNode,
};
pub use supervisor::{ServiceSpec, Supervisor, SupervisorConfig, SupervisorEvent};
