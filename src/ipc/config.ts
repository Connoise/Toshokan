// C8 — settings persistence.
import { invoke } from "@tauri-apps/api/core";
import { backendActive } from "./index";
import type { Config } from "./types";

export const DEFAULT_CONFIG: Config = {
  version: 1,
  directories: [{ path: "~/Projects", autoScan: true }],
  appearance: { theme: "Lithic Light", density: "regular", railEmblem: true },
  vaultRoot: null,
  management: {
    editor: "VS Code",
    terminal: "Default terminal",
    defaultBranch: "main",
    restoreSession: true,
    rescanOnLaunch: false,
    confirmStop: true,
  },
  updates: { confirmBeforeUpdate: true, runInstallAfterUpdate: false },
  session: { lastTab: "projects", lastProjectId: "idolmancer" },
};

// Phase 0/1: persist appearance/session to localStorage so reloads keep state.
// Phase 1+ (C8) backs this with invoke("get_config") / invoke("patch_config").
const LS_KEY = "toshokan.config";

export async function getConfig(): Promise<Config> {
  if (backendActive) return invoke<Config>("get_config");
  try {
    const raw = typeof localStorage !== "undefined" && localStorage.getItem(LS_KEY);
    if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    /* fall through to default */
  }
  return DEFAULT_CONFIG;
}

export async function patchConfig(patch: Partial<Config>): Promise<Config> {
  if (backendActive) return invoke<Config>("patch_config", { patch });
  const next = { ...(await getConfig()), ...patch };
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(LS_KEY, JSON.stringify(next));
  } catch {
    /* ignore persistence failures */
  }
  return next;
}
