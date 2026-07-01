//! Data shapes shared with the frontend (mirror of src/ipc/types.ts).
//! All structs serialize to camelCase to match the TypeScript contract.

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Subproject {
    pub name: String,
    pub desc: String,
    pub last_opened: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
}

/// A discovered project. Produced by the scanner (C1) and enriched with stack,
/// git, and summary (C2/C3). `service_count`/`service` are filled later by the
/// supervisor + overlay manifests (Phase 3).
#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: String,
    pub name: String,
    pub desc: String,
    pub tech: Vec<String>,
    pub path: String,
    pub last_opened: String,
    pub last_opened_at: i64, // epoch seconds (sort)
    pub sort_key: i64,
    pub branch: String,
    pub repo: String, // "Local only" or a short remote label
    pub service_count: u32,
    pub subprojects: Vec<Subproject>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub summary: Option<Summary>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub git: Option<GitInfo>,
    pub updatable: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CommitInfo {
    pub hash: String,
    pub summary: String,
    pub date: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct GitInfo {
    pub branch: String,
    pub remote: String, // "Local only" when there is no remote
    pub dirty: bool,
    pub ahead: u32,
    pub behind: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_commit: Option<CommitInfo>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TreeNode {
    pub name: String,
    #[serde(rename = "type")]
    pub kind: NodeType,
    pub modified: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", rename = "kind")]
    pub file_kind: Option<String>,
    /// Set true for a directory hosting a running service (filled by the supervisor; None here).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub running: Option<bool>,
    /// Always None from list_dir — the tree is lazy, one level at a time.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<TreeNode>>,
}

#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum NodeType {
    Dir,
    File,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct FilePreview {
    pub kind: String,
    pub size: String,
    pub modified: String,
    pub lines: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Summary {
    pub source: String,
    pub updated: String,
    pub paragraphs: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub markdown: Option<String>,
}

// ---- Services (C5/C6) --------------------------------------------------------

#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ServiceKind {
    Server,
    Daemon,
    Job,
}

impl ServiceKind {
    pub fn from_str_loose(s: &str) -> ServiceKind {
        match s.to_lowercase().as_str() {
            "daemon" => ServiceKind::Daemon,
            "job" => ServiceKind::Job,
            _ => ServiceKind::Server,
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ServiceState {
    Running,
    Starting,
    Stopped,
    Failed,
}

#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum LogSeverity {
    Info,
    Ok,
    Warn,
    Error,
    Plain,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LogLine {
    pub ts: String,
    pub severity: LogSeverity,
    pub text: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ServiceError {
    pub code: String,
    pub message: String,
    pub time: String,
}
