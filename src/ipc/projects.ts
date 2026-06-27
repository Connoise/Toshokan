// C1/C2/C3 — project discovery, metadata, and summaries.
import { USE_FIXTURES } from "./index";
import { FIXTURE_PROJECTS } from "./fixtures";
import type { Project, Summary, ScanProgress } from "./types";

export async function listProjects(): Promise<Project[]> {
  if (USE_FIXTURES) return FIXTURE_PROJECTS;
  // Phase 1+: return invoke<Project[]>("list_projects");
  return FIXTURE_PROJECTS;
}

export async function getProject(id: string): Promise<Project | null> {
  if (USE_FIXTURES) return FIXTURE_PROJECTS.find((p) => p.id === id) ?? null;
  return FIXTURE_PROJECTS.find((p) => p.id === id) ?? null;
}

export async function getSummary(id: string): Promise<Summary | null> {
  if (USE_FIXTURES) return FIXTURE_PROJECTS.find((p) => p.id === id)?.summary ?? null;
  return null;
}

export async function rescan(_root?: string): Promise<void> {
  // Phase 1+: invoke<void>("rescan", { root }); emits scan://progress
}

export async function lastRefresh(): Promise<string> {
  if (USE_FIXTURES) return "Today, 10:45 AM";
  return new Date().toISOString();
}

/** Subscribe to scan progress events. Returns an unsubscribe fn. No-op under fixtures. */
export function onScanProgress(_cb: (p: ScanProgress) => void): () => void {
  return () => {};
}
