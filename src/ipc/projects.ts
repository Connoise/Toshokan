// C1 (discovery, Phase 1) + C3 (summary, Phase 2).
import { invoke } from "@tauri-apps/api/core";
import { backendActive } from "./index";
import { FIXTURE_PROJECTS } from "./fixtures";
import type { Project, Summary, ScanProgress } from "./types";

// C1 (Phase 1): discovery. Backed by the scanner; fixtures in a plain browser.
export async function listProjects(): Promise<Project[]> {
  if (backendActive) return invoke<Project[]>("list_projects");
  return FIXTURE_PROJECTS;
}

export async function getProject(id: string): Promise<Project | null> {
  if (backendActive) return (await listProjects()).find((p) => p.id === id) ?? null;
  return FIXTURE_PROJECTS.find((p) => p.id === id) ?? null;
}

// C3 (Phase 2): resolve README / Obsidian note for a project. Backed by core.
export async function getSummary(project: Project, vaultRoot?: string | null): Promise<Summary | null> {
  if (backendActive) {
    return invoke<Summary | null>("get_summary", { path: project.path, name: project.name, vaultRoot: vaultRoot ?? null });
  }
  return project.summary ?? null;
}

export async function rescan(root?: string): Promise<void> {
  if (backendActive) return invoke<void>("rescan", { root: root ?? null });
}

export async function lastRefresh(): Promise<string> {
  if (backendActive) return invoke<string>("last_refresh");
  return "Today, 10:45 AM";
}

/** Subscribe to scan progress events. Returns an unsubscribe fn. No-op under fixtures. */
export function onScanProgress(cb: (p: ScanProgress) => void): () => void {
  if (!backendActive) return () => {};
  let unlisten: (() => void) | null = null;
  let cancelled = false;
  import("@tauri-apps/api/event").then(({ listen }) => {
    listen<ScanProgress>("scan://progress", (e) => cb(e.payload)).then((un) => {
      if (cancelled) un();
      else unlisten = un;
    });
  });
  return () => {
    cancelled = true;
    if (unlisten) unlisten();
  };
}
