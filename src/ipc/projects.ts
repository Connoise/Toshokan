// C1 (discovery, Phase 1) + C3 (summary, Phase 2).
import { invoke } from "@tauri-apps/api/core";
import { backendActive } from "./index";
import { FIXTURE_PROJECTS } from "./fixtures";
import type { Project, Summary, ScanProgress } from "./types";

// Phase 1 commands (list_projects/rescan) are not wired yet, so discovery still
// reads fixtures even inside Tauri.
export async function listProjects(): Promise<Project[]> {
  return FIXTURE_PROJECTS;
}

export async function getProject(id: string): Promise<Project | null> {
  return FIXTURE_PROJECTS.find((p) => p.id === id) ?? null;
}

// C3 (Phase 2): resolve README / Obsidian note for a project. Backed by core.
export async function getSummary(project: Project, vaultRoot?: string | null): Promise<Summary | null> {
  if (backendActive) {
    return invoke<Summary | null>("get_summary", { path: project.path, name: project.name, vaultRoot: vaultRoot ?? null });
  }
  return project.summary ?? null;
}

export async function rescan(_root?: string): Promise<void> {
  // Phase 1+: invoke<void>("rescan", { root }); emits scan://progress
}

export async function lastRefresh(): Promise<string> {
  // Phase 1+: invoke<string>("last_refresh")
  return "Today, 10:45 AM";
}

/** Subscribe to scan progress events. Returns an unsubscribe fn. No-op under fixtures. */
export function onScanProgress(_cb: (p: ScanProgress) => void): () => void {
  return () => {};
}
