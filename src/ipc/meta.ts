// C2 — git status & stack detection (Phase 2). Backed by toshokan-core.
import { invoke } from "@tauri-apps/api/core";
import { backendActive } from "./index";
import type { GitInfo } from "./types";

// Sample git states keyed by project id, so the browser/fixtures demo shows the
// branch/dirty/ahead-behind chips. The real app reads these from git_info(path).
const FIXTURE_GIT: Record<string, GitInfo> = {
  idolmancer: { branch: "main", remote: "Local only", dirty: false, ahead: 0, behind: 0, lastCommit: { hash: "a1b2c3d", summary: "tokens: tune signal amber", date: "Today, 9:10 AM" } },
  frogbudget: { branch: "main", remote: "github.com/connoise/frog-budget", dirty: true, ahead: 1, behind: 0, lastCommit: { hash: "9f0e1d2", summary: "wip: projection chart", date: "Yesterday, 4:31 PM" } },
  jagaimo: { branch: "main", remote: "github.com/connoise/jagaimo", dirty: false, ahead: 0, behind: 3, lastCommit: { hash: "7c8b9a0", summary: "core: dedupe ledger import", date: "2d ago" } },
};

export async function gitInfo(idOrPath: string, path?: string): Promise<GitInfo | null> {
  if (backendActive && path) return invoke<GitInfo | null>("git_info", { path });
  return FIXTURE_GIT[idOrPath] ?? null;
}

export async function detectStack(path: string): Promise<string[]> {
  if (backendActive) return invoke<string[]>("detect_stack", { path });
  return [];
}
