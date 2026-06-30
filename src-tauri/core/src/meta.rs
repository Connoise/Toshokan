//! C2 — project metadata enrichment: technology detection and git status.

use crate::model::{CommitInfo, GitInfo};
use crate::timefmt::{humanize_epoch, now_epoch};
use git2::{Repository, StatusOptions};
use std::path::Path;

/// Read git state for a project. Returns `None` when `path` is not a git repo.
pub fn git_info(path: &Path) -> Option<GitInfo> {
    git_info_at(path, now_epoch())
}

/// Testable variant with an injected `now` (epoch seconds) for date humanising.
pub fn git_info_at(path: &Path, now_secs: i64) -> Option<GitInfo> {
    let repo = Repository::open(path).ok()?;

    let head = repo.head().ok();
    let branch = head
        .as_ref()
        .and_then(|h| h.shorthand())
        .unwrap_or("HEAD")
        .to_string();

    let remote = repo
        .find_remote("origin")
        .ok()
        .and_then(|r| r.url().map(str::to_string))
        .unwrap_or_else(|| "Local only".to_string());

    let mut opts = StatusOptions::new();
    opts.include_untracked(true).include_ignored(false);
    let dirty = repo
        .statuses(Some(&mut opts))
        .map(|s| s.iter().any(|e| e.status() != git2::Status::CURRENT))
        .unwrap_or(false);

    let (ahead, behind) = ahead_behind(&repo).unwrap_or((0, 0));

    let last_commit = head
        .as_ref()
        .and_then(|h| h.target())
        .and_then(|oid| repo.find_commit(oid).ok())
        .map(|c| {
            let hash = c.id().to_string().chars().take(7).collect();
            CommitInfo {
                hash,
                summary: c.summary().unwrap_or("").to_string(),
                date: humanize_epoch(c.time().seconds(), now_secs),
            }
        });

    Some(GitInfo {
        branch,
        remote,
        dirty,
        ahead,
        behind,
        last_commit,
    })
}

fn ahead_behind(repo: &Repository) -> Option<(u32, u32)> {
    let head = repo.head().ok()?;
    let local = head.target()?;
    let upstream_buf = repo.branch_upstream_name(head.name()?).ok()?;
    let upstream_name = upstream_buf.as_str()?;
    let upstream_oid = repo.find_reference(upstream_name).ok()?.target()?;
    let (a, b) = repo.graph_ahead_behind(local, upstream_oid).ok()?;
    Some((a as u32, b as u32))
}

/// Detect technology tags from the manifests/markers present in a project dir.
/// Heuristic and order-stable; intentionally conservative.
pub fn detect_stack(path: &Path) -> Vec<String> {
    let mut tags: Vec<String> = Vec::new();
    let push = |t: &str, tags: &mut Vec<String>| {
        if !tags.iter().any(|x| x == t) {
            tags.push(t.to_string());
        }
    };

    let has = |f: &str| path.join(f).exists();

    // JavaScript / TypeScript ecosystem
    if has("package.json") {
        let pkg = std::fs::read_to_string(path.join("package.json")).unwrap_or_default();
        let deps = pkg.to_lowercase();
        if has("tsconfig.json") || deps.contains("\"typescript\"") {
            push("TypeScript", &mut tags);
        }
        if deps.contains("\"react\"") {
            push("React", &mut tags);
        }
        if deps.contains("\"next\"") {
            push("Next.js", &mut tags);
        }
        if deps.contains("\"svelte\"") {
            push("Svelte", &mut tags);
        }
        if deps.contains("\"vue\"") {
            push("Vue", &mut tags);
        }
        if deps.contains("\"vite\"") {
            push("Vite", &mut tags);
        }
        if deps.contains("@tauri-apps") {
            push("Tauri", &mut tags);
        }
        if deps.contains("@supabase/supabase-js") {
            push("Supabase", &mut tags);
        }
        if tags.is_empty() {
            push("Node", &mut tags);
        }
    }

    // Python
    if has("pyproject.toml") || has("requirements.txt") || has("setup.py") {
        push("Python", &mut tags);
        let reqs = std::fs::read_to_string(path.join("requirements.txt")).unwrap_or_default()
            + &std::fs::read_to_string(path.join("pyproject.toml")).unwrap_or_default();
        let reqs = reqs.to_lowercase();
        if reqs.contains("fastapi") {
            push("FastAPI", &mut tags);
        }
        if reqs.contains("flask") {
            push("Flask", &mut tags);
        }
        if reqs.contains("django") {
            push("Django", &mut tags);
        }
    }

    if has("Cargo.toml") {
        push("Rust", &mut tags);
    }
    if has("go.mod") {
        push("Go", &mut tags);
    }

    tags
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn non_git_dir_returns_none() {
        let dir = tempdir().unwrap();
        assert!(git_info(dir.path()).is_none());
    }

    #[test]
    fn detect_react_typescript_vite() {
        let dir = tempdir().unwrap();
        fs::write(dir.path().join("tsconfig.json"), "{}").unwrap();
        fs::write(
            dir.path().join("package.json"),
            r#"{"dependencies":{"react":"18","vite":"5"},"devDependencies":{"@supabase/supabase-js":"2"}}"#,
        )
        .unwrap();
        let tags = detect_stack(dir.path());
        assert!(tags.contains(&"TypeScript".to_string()));
        assert!(tags.contains(&"React".to_string()));
        assert!(tags.contains(&"Vite".to_string()));
        assert!(tags.contains(&"Supabase".to_string()));
    }

    #[test]
    fn detect_python_fastapi() {
        let dir = tempdir().unwrap();
        fs::write(dir.path().join("requirements.txt"), "fastapi\nuvicorn\n").unwrap();
        let tags = detect_stack(dir.path());
        assert_eq!(tags, vec!["Python", "FastAPI"]);
    }
}
