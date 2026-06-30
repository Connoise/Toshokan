//! Data shapes shared with the frontend (mirror of src/ipc/types.ts).
//! All structs serialize to camelCase to match the TypeScript contract.

use serde::{Deserialize, Serialize};

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
