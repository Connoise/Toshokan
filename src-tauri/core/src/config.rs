//! C8 — settings persistence. Load/save/migrate the config file. Path
//! resolution (app_config_dir) is the tauri layer's job; this module works on
//! any path so it is testable in isolation.

use serde::{Deserialize, Serialize};
use std::path::Path;

pub const CONFIG_VERSION: u32 = 1;

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceDirectory {
    pub path: String,
    pub auto_scan: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Appearance {
    pub theme: String,   // "Lithic Light" | "Basalt Dark"
    pub density: String, // "regular" | "compact"
    pub rail_emblem: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ManagementPrefs {
    pub editor: String,
    pub terminal: String,
    pub default_branch: String,
    pub restore_session: bool,
    pub rescan_on_launch: bool,
    pub confirm_stop: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePrefs {
    pub confirm_before_update: bool,
    pub run_install_after_update: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    pub last_tab: String,
    pub last_project_id: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Config {
    pub version: u32,
    pub directories: Vec<WorkspaceDirectory>,
    pub appearance: Appearance,
    pub vault_root: Option<String>,
    pub management: ManagementPrefs,
    pub updates: UpdatePrefs,
    pub session: Session,
}

impl Default for Config {
    fn default() -> Self {
        Config {
            version: CONFIG_VERSION,
            directories: vec![WorkspaceDirectory { path: "~/Projects".into(), auto_scan: true }],
            appearance: Appearance {
                theme: "Lithic Light".into(),
                density: "regular".into(),
                rail_emblem: true,
            },
            vault_root: None,
            management: ManagementPrefs {
                editor: "VS Code".into(),
                terminal: "Default terminal".into(),
                default_branch: "main".into(),
                restore_session: true,
                rescan_on_launch: false,
                confirm_stop: true,
            },
            updates: UpdatePrefs { confirm_before_update: true, run_install_after_update: false },
            session: Session { last_tab: "projects".into(), last_project_id: Some("idolmancer".into()) },
        }
    }
}

/// Load config from `path`. Missing file → defaults. Corrupt file → back it up
/// and return defaults. Older versions are migrated forward.
pub fn load(path: &Path) -> Config {
    let Ok(text) = std::fs::read_to_string(path) else {
        return Config::default();
    };
    match serde_json::from_str::<Config>(&text) {
        Ok(cfg) => migrate(cfg),
        Err(_) => {
            let _ = std::fs::rename(path, path.with_extension("json.bak"));
            Config::default()
        }
    }
}

/// Persist config (pretty JSON), creating parent directories as needed.
pub fn save(path: &Path, cfg: &Config) -> std::io::Result<()> {
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)?;
    }
    let text = serde_json::to_string_pretty(cfg).map_err(std::io::Error::other)?;
    std::fs::write(path, text)
}

fn migrate(mut cfg: Config) -> Config {
    // No historical versions yet; stamp current and return.
    if cfg.version < CONFIG_VERSION {
        cfg.version = CONFIG_VERSION;
    }
    cfg
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn missing_file_returns_default() {
        let dir = tempdir().unwrap();
        let cfg = load(&dir.path().join("config.json"));
        assert_eq!(cfg, Config::default());
    }

    #[test]
    fn roundtrip_preserves_config() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("config.json");
        let mut cfg = Config::default();
        cfg.vault_root = Some("~/Obsidian/Vault".into());
        cfg.directories.push(WorkspaceDirectory { path: "~/Archive".into(), auto_scan: false });
        save(&path, &cfg).unwrap();
        assert_eq!(load(&path), cfg);
    }

    #[test]
    fn corrupt_file_backs_up_and_defaults() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("config.json");
        std::fs::write(&path, "{ not valid json ").unwrap();
        let cfg = load(&path);
        assert_eq!(cfg, Config::default());
        assert!(path.with_extension("json.bak").exists());
    }

    #[test]
    fn camelcase_serialization() {
        let json = serde_json::to_string(&Config::default()).unwrap();
        assert!(json.contains("\"autoScan\""));
        assert!(json.contains("\"railEmblem\""));
        assert!(json.contains("\"vaultRoot\""));
    }
}
