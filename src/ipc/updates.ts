// C9 — project updates (git sync). See PLAN §5.
import { USE_FIXTURES } from "./index";
import type { UpdateStatus } from "./types";

/** Fetch the remote and compute ahead/behind + incoming commits. */
export async function checkUpdates(_id: string): Promise<UpdateStatus> {
  if (USE_FIXTURES) {
    // Sample "up to date, clean" status for the prototype.
    return {
      isGit: true,
      remote: "origin",
      branch: "main",
      ahead: 0,
      behind: 0,
      diverged: false,
      dirty: false,
      incoming: [],
    };
  }
  // Phase 4+: invoke<UpdateStatus>("check_updates", { id })
  return { isGit: false, remote: null, branch: "", ahead: 0, behind: 0, diverged: false, dirty: false, incoming: [] };
}

/** Fast-forward-only pull. Refuses when dirty or diverged. Emits update://progress. */
export async function updateProject(_id: string, _runInstall = false): Promise<void> {
  // Phase 4+: invoke<void>("update_project", { id, runInstall })
}
