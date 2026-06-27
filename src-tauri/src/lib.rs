// Toshokan — Rust core entry point.
//
// Phase 0: stands up the window over the Vite frontend (which runs on fixtures).
// Later phases add the typed command surface (C1–C9) and the desktop-only
// supervisor module behind a capability boundary. See PLAN.md §2, §4, §6.

#[tauri::command]
fn app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![app_version])
        .run(tauri::generate_context!())
        .expect("error while running Toshokan");
}
