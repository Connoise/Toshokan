// Toshokan — IPC data layer.
//
// Components never call invoke()/listen() directly; they call these typed
// functions. While USE_FIXTURES is true (Phase 0) the layer returns the
// fixture data unchanged. In later phases each function swaps its body to a
// Tauri `invoke(...)` while keeping the exact same signature, so components
// stay untouched (HANDOFF §4 "Frontend integration").

// Master override: force fixtures even inside Tauri (useful for visual regression).
export const USE_FIXTURES = false;

/** True when running inside the Tauri WebView (vs. a plain browser / Vite dev). */
export const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/**
 * Whether to call the real Rust backend. False in a plain browser (Vite dev,
 * screenshot harness) or when fixtures are forced — those fall back to fixtures
 * so the UI is always demoable. Phase 1 discovery commands aren't wired yet, so
 * listProjects/listServices/getConfig still return fixtures regardless.
 */
export const backendActive = isTauri && !USE_FIXTURES;

export * from "./types";
export * from "./projects";
export * from "./services";
export * from "./fsview";
export * from "./meta";
export * from "./config";
export * from "./updates";
