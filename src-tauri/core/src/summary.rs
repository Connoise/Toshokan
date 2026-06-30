//! C3 — summary / notes ingestion. Resolves a project's README and/or a
//! same-named note in the configured Obsidian vault. **Never writes.**

use crate::model::Summary;
use crate::timefmt::humanize_systemtime;
use std::fs;
use std::path::{Path, PathBuf};

const MAX_PARAGRAPHS: usize = 4;

/// Resolve a project summary. Prefers a vault note `<vault>/<Name>.md` (when a
/// vault root is configured and the note exists), else the project README.
/// Returns `None` when neither is found.
pub fn resolve_summary(project_path: &Path, project_name: &str, vault_root: Option<&Path>) -> Option<Summary> {
    if let Some(vault) = vault_root {
        if let Some(note) = find_vault_note(vault, project_name) {
            return read_summary(&note, &format!("Obsidian · {}", file_name(&note)));
        }
    }
    let readme = find_readme(project_path)?;
    let src = file_name(&readme);
    read_summary(&readme, &src)
}

fn read_summary(file: &Path, source: &str) -> Option<Summary> {
    let markdown = fs::read_to_string(file).ok()?;
    let updated = fs::metadata(file)
        .ok()
        .and_then(|m| m.modified().ok())
        .map(humanize_systemtime)
        .unwrap_or_default();
    Some(Summary {
        source: source.to_string(),
        updated,
        paragraphs: extract_paragraphs(&markdown, MAX_PARAGRAPHS),
        markdown: Some(markdown),
    })
}

/// Case-insensitive README lookup at the project root.
fn find_readme(dir: &Path) -> Option<PathBuf> {
    let entries = fs::read_dir(dir).ok()?;
    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().to_lowercase();
        if name == "readme.md" || name == "readme.markdown" || name == "readme" {
            return Some(entry.path());
        }
    }
    None
}

/// Case-insensitive `<Name>.md` lookup directly under the vault root.
fn find_vault_note(vault: &Path, name: &str) -> Option<PathBuf> {
    let target = format!("{}.md", name.to_lowercase());
    let entries = fs::read_dir(vault).ok()?;
    for entry in entries.flatten() {
        if entry.file_name().to_string_lossy().to_lowercase() == target {
            return Some(entry.path());
        }
    }
    None
}

fn file_name(p: &Path) -> String {
    p.file_name().map(|s| s.to_string_lossy().to_string()).unwrap_or_default()
}

/// Extract the first `max` prose paragraphs for the quick-reference summary card:
/// skip frontmatter, headings, lists, code fences, and quotes; collapse soft wraps.
fn extract_paragraphs(markdown: &str, max: usize) -> Vec<String> {
    let body = strip_frontmatter(markdown);
    let mut paragraphs: Vec<String> = Vec::new();
    let mut current: Vec<String> = Vec::new();
    let mut in_code = false;

    let flush = |current: &mut Vec<String>, out: &mut Vec<String>| {
        if !current.is_empty() {
            out.push(current.join(" ").trim().to_string());
            current.clear();
        }
    };

    for raw in body.lines() {
        let line = raw.trim();
        if line.starts_with("```") {
            in_code = !in_code;
            flush(&mut current, &mut paragraphs);
            continue;
        }
        if in_code {
            continue;
        }
        if line.is_empty() {
            flush(&mut current, &mut paragraphs);
            if paragraphs.len() >= max {
                break;
            }
            continue;
        }
        // skip non-prose lines
        if line.starts_with('#') || line.starts_with('>') || line.starts_with("- ")
            || line.starts_with("* ") || line.starts_with("| ") || line.starts_with("---")
        {
            flush(&mut current, &mut paragraphs);
            continue;
        }
        current.push(strip_inline_md(line));
    }
    flush(&mut current, &mut paragraphs);
    paragraphs.retain(|p| !p.is_empty());
    paragraphs.truncate(max);
    paragraphs
}

fn strip_frontmatter(md: &str) -> &str {
    if let Some(rest) = md.strip_prefix("---\n") {
        if let Some(end) = rest.find("\n---") {
            return &rest[end + 4..];
        }
    }
    md
}

/// Lightweight inline-markdown stripping for the plain-text summary card.
fn strip_inline_md(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut chars = s.chars().peekable();
    while let Some(c) = chars.next() {
        match c {
            '*' | '_' | '`' => continue,
            '[' => {
                // [text](url) -> text
                let mut text = String::new();
                for c2 in chars.by_ref() {
                    if c2 == ']' {
                        break;
                    }
                    text.push(c2);
                }
                if chars.peek() == Some(&'(') {
                    for c2 in chars.by_ref() {
                        if c2 == ')' {
                            break;
                        }
                    }
                }
                out.push_str(&text);
            }
            _ => out.push(c),
        }
    }
    out.trim().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn reads_readme_and_extracts_prose() {
        let dir = tempdir().unwrap();
        fs::write(
            dir.path().join("README.md"),
            "# Title\n\nFirst **para** with a [link](http://x).\n\n- a list item\n\nSecond para.\n",
        )
        .unwrap();
        let s = resolve_summary(dir.path(), "Whatever", None).unwrap();
        assert_eq!(s.source, "README.md");
        assert_eq!(s.paragraphs[0], "First para with a link.");
        assert_eq!(s.paragraphs[1], "Second para.");
        assert!(s.markdown.unwrap().contains("# Title"));
    }

    #[test]
    fn vault_note_takes_precedence() {
        let proj = tempdir().unwrap();
        let vault = tempdir().unwrap();
        fs::write(proj.path().join("README.md"), "readme body").unwrap();
        fs::write(vault.path().join("Plastiglom.md"), "vault body").unwrap();
        let s = resolve_summary(proj.path(), "Plastiglom", Some(vault.path())).unwrap();
        assert!(s.source.starts_with("Obsidian"));
        assert_eq!(s.markdown.unwrap(), "vault body");
    }

    #[test]
    fn none_when_no_readme() {
        let dir = tempdir().unwrap();
        assert!(resolve_summary(dir.path(), "X", None).is_none());
    }

    #[test]
    fn strips_yaml_frontmatter() {
        let dir = tempdir().unwrap();
        fs::write(
            dir.path().join("README.md"),
            "---\ntitle: x\n---\nReal paragraph here.\n",
        )
        .unwrap();
        let s = resolve_summary(dir.path(), "X", None).unwrap();
        assert_eq!(s.paragraphs[0], "Real paragraph here.");
    }
}
