// Toshokan — Rust core entry point.
//
// Stands up the window over the Vite frontend and the command surface backed by
// toshokan-core: discovery (C1) + config (C8) [Phase 1], git/stack (C2), notes
// (C3), fsview (C4) [Phase 2]. Phases 3/4 add the supervisor and system actions.

mod commands;
mod state;
mod util;
mod watcher;

use state::{run_scan, AppState};
use std::path::PathBuf;
use tauri::Manager;
use toshokan_core::config as cfg;

#[tauri::command]
fn app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle().clone();
            let config_dir = handle.path().app_config_dir().unwrap_or_else(|_| PathBuf::from("."));
            let config_path = config_dir.join("config.json");
            let config = cfg::load(&config_path);
            app.manage(AppState::new(config, config_path));

            // Initial scan and the live watcher run off the UI thread.
            let scan_handle = handle.clone();
            std::thread::spawn(move || run_scan(&scan_handle, None));
            watcher::spawn(handle);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            app_version,
            commands::list_projects,
            commands::rescan,
            commands::last_refresh,
            commands::scan_dir,
            commands::get_config,
            commands::patch_config,
            commands::git_info,
            commands::detect_stack,
            commands::list_dir,
            commands::preview_file,
            commands::get_summary,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Toshokan");
}
