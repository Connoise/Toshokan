// Toshokan — IPC data layer.
//
// Components never call invoke()/listen() directly; they call these typed
// functions. While USE_FIXTURES is true (Phase 0) the layer returns the
// fixture data unchanged. In later phases each function swaps its body to a
// Tauri `invoke(...)` while keeping the exact same signature, so components
// stay untouched (HANDOFF §4 "Frontend integration").

export const USE_FIXTURES = true;

/** True when running inside the Tauri WebView (vs. a plain browser/Vite dev). */
export const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export * from "./types";
export * from "./projects";
export * from "./services";
export * from "./fsview";
export * from "./config";
export * from "./updates";
