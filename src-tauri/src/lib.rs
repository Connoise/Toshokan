// Toshokan — Rust core entry point.
//
// Stands up the window over the Vite frontend. Phase 2 adds the C2/C3/C4
// command surface (git/stack, summary/notes, fsview) backed by toshokan-core.
// Phases 1/3/4 add discovery, the supervisor, system actions, and updates.

mod commands;

#[tauri::command]
fn app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            app_version,
            commands::git_info,
            commands::detect_stack,
            commands::list_dir,
            commands::preview_file,
            commands::get_summary,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Toshokan");
}
