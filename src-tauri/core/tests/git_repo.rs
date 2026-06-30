//! Integration test: read git state from the Toshokan repo this crate lives in.

use std::path::PathBuf;
use toshokan_core::meta::git_info;

fn repo_root() -> PathBuf {
    // CARGO_MANIFEST_DIR = <repo>/src-tauri/core
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("..")
}

#[test]
fn reads_branch_and_last_commit_from_real_repo() {
    let info = git_info(&repo_root()).expect("Toshokan repo should be a git repository");
    assert!(!info.branch.is_empty(), "branch should be populated");
    let commit = info.last_commit.expect("HEAD should have a commit");
    assert_eq!(commit.hash.len(), 7, "short hash is 7 chars");
    assert!(!commit.summary.is_empty(), "commit summary should be populated");
    assert!(!commit.date.is_empty(), "commit date should be humanised");
}
