//! C4 — directory cross-section and file preview. Lazy: one level at a time,
//! guarding binary and oversized files.

use crate::model::{FilePreview, NodeType, TreeNode};
use crate::timefmt::humanize_systemtime;
use std::fs;
use std::path::Path;

const PREVIEW_MAX_BYTES: u64 = 512 * 1024; // skip files larger than 512 KB
const DEFAULT_MAX_LINES: usize = 200;

/// List one directory level. Directories first, then files, each alphabetical
/// (case-insensitive). Children are not populated — expansion re-calls this.
pub fn list_dir(path: &Path) -> std::io::Result<Vec<TreeNode>> {
    let mut nodes: Vec<TreeNode> = Vec::new();
    for entry in fs::read_dir(path)? {
        let entry = entry?;
        let meta = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };
        let name = entry.file_name().to_string_lossy().to_string();
        let modified = meta.modified().map(humanize_systemtime).unwrap_or_default();
        if meta.is_dir() {
            nodes.push(TreeNode {
                name,
                kind: NodeType::Dir,
                modified,
                size: None,
                file_kind: None,
                running: None,
                children: None,
            });
        } else {
            nodes.push(TreeNode {
                name: name.clone(),
                kind: NodeType::File,
                modified,
                size: Some(human_size(meta.len())),
                file_kind: Some(file_kind(&name)),
                running: None,
                children: None,
            });
        }
    }
    nodes.sort_by(|a, b| match (a.kind, b.kind) {
        (NodeType::Dir, NodeType::File) => std::cmp::Ordering::Less,
        (NodeType::File, NodeType::Dir) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });
    Ok(nodes)
}

/// First `max_lines` lines of a text file. Returns `None` for missing, oversized,
/// or binary files.
pub fn preview_file(path: &Path, max_lines: Option<usize>) -> Option<FilePreview> {
    let meta = fs::metadata(path).ok()?;
    if !meta.is_file() || meta.len() > PREVIEW_MAX_BYTES {
        return None;
    }
    let bytes = fs::read(path).ok()?;
    if is_binary(&bytes) {
        return None;
    }
    let text = String::from_utf8_lossy(&bytes);
    let limit = max_lines.unwrap_or(DEFAULT_MAX_LINES);
    let lines: Vec<String> = text.lines().take(limit).map(str::to_string).collect();
    let name = path.file_name()?.to_string_lossy().to_string();
    Some(FilePreview {
        kind: file_kind(&name),
        size: human_size(meta.len()),
        modified: meta.modified().map(humanize_systemtime).unwrap_or_default(),
        lines,
    })
}

fn is_binary(bytes: &[u8]) -> bool {
    bytes.iter().take(8000).any(|&b| b == 0)
}

fn human_size(bytes: u64) -> String {
    if bytes < 1024 {
        format!("{bytes} B")
    } else if bytes < 1024 * 1024 {
        format!("{:.1} KB", bytes as f64 / 1024.0)
    } else {
        format!("{:.1} MB", bytes as f64 / (1024.0 * 1024.0))
    }
}

/// Human label for the file's type, by extension (mirrors the prototype's `kind`).
pub fn file_kind(name: &str) -> String {
    let ext = name.rsplit('.').next().unwrap_or("").to_lowercase();
    match ext.as_str() {
        "md" | "markdown" => "Markdown",
        "json" => "JSON",
        "yml" | "yaml" => "YAML",
        "toml" => "TOML",
        "ts" | "tsx" => "TypeScript",
        "js" | "jsx" | "mjs" | "cjs" => "JavaScript",
        "py" => "Python",
        "rs" => "Rust",
        "css" => "CSS",
        "html" => "HTML",
        "png" | "jpg" | "jpeg" | "gif" | "webp" | "svg" => "image",
        "txt" => "Text",
        _ => "File",
    }
    .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn lists_dirs_before_files_sorted() {
        let dir = tempdir().unwrap();
        fs::create_dir(dir.path().join("src")).unwrap();
        fs::create_dir(dir.path().join("Apps")).unwrap();
        fs::write(dir.path().join("README.md"), "# hi").unwrap();
        fs::write(dir.path().join("a.txt"), "x").unwrap();
        let nodes = list_dir(dir.path()).unwrap();
        let names: Vec<&str> = nodes.iter().map(|n| n.name.as_str()).collect();
        assert_eq!(names, vec!["Apps", "src", "a.txt", "README.md"]);
        assert_eq!(nodes[0].kind, NodeType::Dir);
    }

    #[test]
    fn preview_reads_head_and_marks_kind() {
        let dir = tempdir().unwrap();
        let f = dir.path().join("notes.md");
        fs::write(&f, "# Title\nline2\nline3\n").unwrap();
        let p = preview_file(&f, Some(2)).unwrap();
        assert_eq!(p.kind, "Markdown");
        assert_eq!(p.lines, vec!["# Title", "line2"]);
    }

    #[test]
    fn preview_rejects_binary() {
        let dir = tempdir().unwrap();
        let f = dir.path().join("blob.bin");
        fs::write(&f, [0u8, 1, 2, 3, 0, 5]).unwrap();
        assert!(preview_file(&f, None).is_none());
    }
}
