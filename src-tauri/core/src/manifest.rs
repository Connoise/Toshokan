//! Project manifest (`toshokan.yml`) — the PLAN §3 schema. Resolution order:
//! in-repo `toshokan.yml` at the project root wins, else an overlay manifest
//! stored in Toshokan's own config dir (`manifests/<project-id>.yml`).

use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq, Default)]
#[serde(rename_all = "camelCase")]
pub struct Manifest {
    #[serde(default)]
    pub name: Option<String>,
    /// The headline "Launch" command for the project.
    #[serde(default)]
    pub launch: Option<String>,
    /// "vault" | a path relative to the project | omitted (README).
    #[serde(default)]
    pub notes: Option<String>,
    /// Env files (relative to the project root) loaded into service children.
    #[serde(default)]
    pub env: Vec<String>,
    #[serde(default)]
    pub update: Option<UpdateSpec>,
    #[serde(default)]
    pub services: Vec<ManifestService>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq, Default)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSpec {
    #[serde(default)]
    pub remote: Option<String>,
    #[serde(default)]
    pub install: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ManifestService {
    pub name: String,
    #[serde(default = "default_kind")]
    pub kind: String, // "server" | "daemon" | "job"
    pub command: String,
    #[serde(default)]
    pub runtime: Option<String>,
    #[serde(default)]
    pub port: Option<u16>,
    /// Working dir relative to the project root (default ".").
    #[serde(default)]
    pub cwd: Option<String>,
    /// Local URL override (default derived from port).
    #[serde(default)]
    pub url: Option<String>,
    /// Per-service env files (overrides the manifest-level list).
    #[serde(default)]
    pub env: Option<Vec<String>>,
    /// Cron expression — job kind only.
    #[serde(default)]
    pub schedule: Option<String>,
}

fn default_kind() -> String {
    "server".to_string()
}

pub fn parse(text: &str) -> Result<Manifest, String> {
    serde_yaml::from_str(text).map_err(|e| e.to_string())
}

/// Load the manifest for a project: in-repo `toshokan.yml`/`toshokan.yaml`
/// first, else `<overlay_dir>/<project_id>.yml`.
pub fn load(project_path: &Path, project_id: &str, overlay_dir: Option<&Path>) -> Option<Manifest> {
    for name in ["toshokan.yml", "toshokan.yaml"] {
        let p = project_path.join(name);
        if let Ok(text) = std::fs::read_to_string(&p) {
            match parse(&text) {
                Ok(m) => return Some(m),
                Err(e) => eprintln!("toshokan: bad manifest {}: {e}", p.display()),
            }
        }
    }
    if let Some(dir) = overlay_dir {
        for name in [format!("{project_id}.yml"), format!("{project_id}.yaml")] {
            let p = dir.join(name);
            if let Ok(text) = std::fs::read_to_string(&p) {
                match parse(&text) {
                    Ok(m) => return Some(m),
                    Err(e) => eprintln!("toshokan: bad overlay {}: {e}", p.display()),
                }
            }
        }
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    const SAMPLE: &str = r#"
name: Plastiglom
launch: python -m plastiglom.apps.web_app --port 8001
env: [".env"]
update:
  remote: origin
  install: pip install -e .
services:
  - name: Web App
    kind: server
    runtime: uvicorn / FastAPI
    command: python -m plastiglom.apps.web_app --port 8001
    port: 8001
  - name: LLM Scheduler
    kind: job
    command: python -m plastiglom.apps.llm_scheduler run
    schedule: "0 * * * *"
"#;

    #[test]
    fn parses_full_schema() {
        let m = parse(SAMPLE).unwrap();
        assert_eq!(m.name.as_deref(), Some("Plastiglom"));
        assert_eq!(m.env, vec![".env"]);
        assert_eq!(m.services.len(), 2);
        assert_eq!(m.services[0].kind, "server");
        assert_eq!(m.services[0].port, Some(8001));
        assert_eq!(m.services[1].kind, "job");
        assert_eq!(m.services[1].schedule.as_deref(), Some("0 * * * *"));
        assert_eq!(m.update.unwrap().install.as_deref(), Some("pip install -e ."));
    }

    #[test]
    fn in_repo_manifest_wins_over_overlay() {
        let proj = tempdir().unwrap();
        let overlay = tempdir().unwrap();
        fs::write(proj.path().join("toshokan.yml"), "name: InRepo\n").unwrap();
        fs::write(overlay.path().join("proj.yml"), "name: Overlay\n").unwrap();
        let m = load(proj.path(), "proj", Some(overlay.path())).unwrap();
        assert_eq!(m.name.as_deref(), Some("InRepo"));
    }

    #[test]
    fn overlay_used_when_no_in_repo() {
        let proj = tempdir().unwrap();
        let overlay = tempdir().unwrap();
        fs::write(overlay.path().join("proj.yml"), "name: Overlay\nservices:\n  - name: Dev\n    command: npm run dev\n").unwrap();
        let m = load(proj.path(), "proj", Some(overlay.path())).unwrap();
        assert_eq!(m.name.as_deref(), Some("Overlay"));
        assert_eq!(m.services[0].kind, "server"); // default
    }

    #[test]
    fn missing_everywhere_is_none() {
        let proj = tempdir().unwrap();
        assert!(load(proj.path(), "x", None).is_none());
    }
}
