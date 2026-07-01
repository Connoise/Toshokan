//! C1 — directory scanning & project discovery. Walks a registered root one
//! level deep, treats a child as a project when it carries a known marker, and
//! recurses one extra level for subprojects. Enriches via meta (C2) + summary (C3).

use crate::meta::{detect_stack, git_info};
use crate::model::{Project, Subproject};
use crate::summary::resolve_summary;
use crate::timefmt::{humanize_epoch, now_epoch};
use std::fs;
use std::path::Path;
use std::time::SystemTime;

/// Files/dirs whose presence marks a directory as a project.
const PROJECT_MARKERS: &[&str] = &[
    ".git",
    "package.json",
    "toshokan.yml",
    "toshokan.yaml",
    "pyproject.toml",
    "Cargo.toml",
    "go.mod",
    "requirements.txt",
];

/// Directory names never treated as a project or descended into.
const IGNORED_DIRS: &[&str] = &["node_modules", ".git", "target", "dist", "build", ".venv", "venv", "__pycache__"];

pub fn is_project_dir(path: &Path) -> bool {
    if !path.is_dir() {
        return false;
    }
    if PROJECT_MARKERS.iter().any(|m| path.join(m).exists()) {
        return true;
    }
    has_readme(path)
}

fn has_readme(dir: &Path) -> bool {
    fs::read_dir(dir)
        .map(|it| {
            it.flatten().any(|e| {
                let n = e.file_name().to_string_lossy().to_lowercase();
                n == "readme.md" || n == "readme.markdown" || n == "readme"
            })
        })
        .unwrap_or(false)
}

fn ignored(name: &str) -> bool {
    name.starts_with('.') || IGNORED_DIRS.contains(&name)
}

/// Scan a single registered root. Returns projects sorted most-recent first,
/// with `sort_key` assigned by that order.
pub fn scan_root(root: &Path, vault_root: Option<&Path>) -> Vec<Project> {
    scan_root_at(root, vault_root, now_epoch())
}

pub fn scan_root_at(root: &Path, vault_root: Option<&Path>, now: i64) -> Vec<Project> {
    let mut projects: Vec<Project> = Vec::new();
    let Ok(entries) = fs::read_dir(root) else {
        return projects; // missing/denied root → skip (caller warns)
    };
    for entry in entries.flatten() {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        if !path.is_dir() || ignored(&name) {
            continue;
        }
        if is_project_dir(&path) {
            projects.push(build_project(&path, vault_root, now, true));
        }
    }
    projects.sort_by(|a, b| b.last_opened_at.cmp(&a.last_opened_at).then(a.name.cmp(&b.name)));
    for (i, p) in projects.iter_mut().enumerate() {
        p.sort_key = i as i64;
    }
    projects
}

fn build_project(path: &Path, vault_root: Option<&Path>, now: i64, with_subprojects: bool) -> Project {
    let name = dir_name(path);
    let git = git_info(path);
    let tech = detect_stack(path);
    let summary = resolve_summary(path, &name, vault_root);
    let last_opened_at = mtime_epoch(path);

    let (branch, repo, updatable) = match &git {
        Some(g) => {
            let repo = if g.remote == "Local only" {
                "Local only".to_string()
            } else {
                short_remote(&g.remote)
            };
            (g.branch.clone(), repo, g.remote != "Local only")
        }
        None => ("—".to_string(), "Local only".to_string(), false),
    };

    let subprojects = if with_subprojects {
        scan_subprojects(path, vault_root, now)
    } else {
        Vec::new()
    };

    Project {
        id: slugify(&name),
        name: name.clone(),
        desc: derive_desc(path, summary.as_ref()),
        tech,
        path: display_path(path),
        last_opened: humanize_epoch(last_opened_at, now),
        last_opened_at,
        sort_key: 0,
        branch,
        repo,
        service_count: 0, // filled by the supervisor + overlay manifests (Phase 3)
        subprojects,
        summary,
        git,
        updatable,
    }
}

fn scan_subprojects(parent: &Path, vault_root: Option<&Path>, now: i64) -> Vec<Subproject> {
    let mut subs: Vec<Subproject> = Vec::new();
    let Ok(entries) = fs::read_dir(parent) else {
        return subs;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        if !path.is_dir() || ignored(&name) {
            continue;
        }
        if is_project_dir(&path) {
            let p = build_project(&path, vault_root, now, false);
            subs.push(Subproject {
                name: p.name,
                desc: p.desc,
                last_opened: p.last_opened,
                path: Some(p.path),
            });
        }
    }
    subs.sort_by(|a, b| a.name.cmp(&b.name));
    subs
}

// ---- helpers ---------------------------------------------------------------

fn dir_name(path: &Path) -> String {
    path.file_name().map(|s| s.to_string_lossy().to_string()).unwrap_or_default()
}

/// Lowercased, alphanumeric-only id (e.g. "Frog Budget" -> "frogbudget").
fn slugify(name: &str) -> String {
    name.chars().filter(|c| c.is_alphanumeric()).flat_map(char::to_lowercase).collect()
}

fn mtime_epoch(path: &Path) -> i64 {
    fs::metadata(path)
        .and_then(|m| m.modified())
        .ok()
        .and_then(|t| t.duration_since(SystemTime::UNIX_EPOCH).ok())
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

/// Collapse a home-prefixed absolute path to `~/...` for display.
fn display_path(path: &Path) -> String {
    let s = path.to_string_lossy().to_string();
    if let Some(home) = std::env::var_os("HOME").or_else(|| std::env::var_os("USERPROFILE")) {
        let home = home.to_string_lossy().to_string();
        if let Some(rest) = s.strip_prefix(&home) {
            return format!("~{rest}");
        }
    }
    s
}

/// Shorten a remote URL to a "host/owner/repo" label.
fn short_remote(url: &str) -> String {
    let trimmed = url.trim_end_matches(".git");
    if let Some(rest) = trimmed.strip_prefix("git@") {
        // git@github.com:owner/repo -> github.com/owner/repo
        return rest.replacen(':', "/", 1);
    }
    for pre in ["https://", "http://", "ssh://"] {
        if let Some(rest) = trimmed.strip_prefix(pre) {
            return rest.trim_start_matches("git@").to_string();
        }
    }
    trimmed.to_string()
}

/// Project description: package.json `description`, else the first summary
/// paragraph (truncated), else empty.
fn derive_desc(path: &Path, summary: Option<&crate::model::Summary>) -> String {
    if let Ok(text) = fs::read_to_string(path.join("package.json")) {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&text) {
            if let Some(d) = v.get("description").and_then(|d| d.as_str()) {
                if !d.trim().is_empty() {
                    return d.trim().to_string();
                }
            }
        }
    }
    if let Some(s) = summary {
        if let Some(first) = s.paragraphs.first() {
            return truncate(first, 90);
        }
    }
    String::new()
}

fn truncate(s: &str, max: usize) -> String {
    if s.chars().count() <= max {
        return s.to_string();
    }
    let cut: String = s.chars().take(max).collect();
    let cut = cut.rsplit_once(' ').map(|(a, _)| a).unwrap_or(&cut);
    format!("{}…", cut.trim_end_matches([',', '.', ';', ':']))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    fn mk_project(root: &Path, name: &str, marker: &str, contents: &str) {
        let p = root.join(name);
        fs::create_dir_all(&p).unwrap();
        fs::write(p.join(marker), contents).unwrap();
    }

    #[test]
    fn discovers_projects_by_marker() {
        let root = tempdir().unwrap();
        mk_project(root.path(), "Frog Budget", "package.json", r#"{"description":"budget PWA","dependencies":{"react":"18","vite":"5"}}"#);
        mk_project(root.path(), "Sando", "requirements.txt", "fastapi\n");
        // a non-project dir is ignored
        fs::create_dir_all(root.path().join("node_modules")).unwrap();
        fs::create_dir_all(root.path().join("empty")).unwrap();

        let projects = scan_root_at(root.path(), None, now_epoch());
        let names: Vec<&str> = projects.iter().map(|p| p.name.as_str()).collect();
        assert!(names.contains(&"Frog Budget"));
        assert!(names.contains(&"Sando"));
        assert!(!names.contains(&"empty"));
        assert_eq!(projects.len(), 2);

        let frog = projects.iter().find(|p| p.name == "Frog Budget").unwrap();
        assert_eq!(frog.id, "frogbudget");
        assert_eq!(frog.desc, "budget PWA");
        assert!(frog.tech.contains(&"React".to_string()));
    }

    #[test]
    fn readme_only_dir_is_a_project() {
        let root = tempdir().unwrap();
        let p = root.path().join("Docs");
        fs::create_dir_all(&p).unwrap();
        fs::write(p.join("README.md"), "# Docs\n\nSome docs.").unwrap();
        let projects = scan_root_at(root.path(), None, now_epoch());
        assert_eq!(projects.len(), 1);
        assert_eq!(projects[0].desc, "Some docs.");
    }

    #[test]
    fn finds_nested_subprojects() {
        let root = tempdir().unwrap();
        let parent = root.path().join("Idolmancer");
        fs::create_dir_all(&parent).unwrap();
        fs::write(parent.join("package.json"), "{}").unwrap();
        mk_project(&parent, "megane", "package.json", r#"{"description":"chart editor"}"#);

        let projects = scan_root_at(root.path(), None, now_epoch());
        let idol = projects.iter().find(|p| p.name == "Idolmancer").unwrap();
        assert_eq!(idol.subprojects.len(), 1);
        assert_eq!(idol.subprojects[0].name, "megane");
        assert_eq!(idol.subprojects[0].desc, "chart editor");
    }

    #[test]
    fn sort_key_follows_recency() {
        let root = tempdir().unwrap();
        mk_project(root.path(), "A", "Cargo.toml", "[package]");
        mk_project(root.path(), "B", "Cargo.toml", "[package]");
        let projects = scan_root_at(root.path(), None, now_epoch());
        assert_eq!(projects[0].sort_key, 0);
        assert_eq!(projects[1].sort_key, 1);
    }

    #[test]
    fn missing_root_yields_empty() {
        let projects = scan_root_at(Path::new("/no/such/dir/xyz"), None, now_epoch());
        assert!(projects.is_empty());
    }

    #[test]
    fn short_remote_forms() {
        assert_eq!(short_remote("https://github.com/connoise/frog-budget.git"), "github.com/connoise/frog-budget");
        assert_eq!(short_remote("git@github.com:connoise/jagaimo.git"), "github.com/connoise/jagaimo");
    }
}
