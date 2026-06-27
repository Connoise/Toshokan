// C5/C6 — service lifecycle, supervision, and logs.
import { USE_FIXTURES } from "./index";
import { FIXTURE_SERVICES } from "./fixtures";
import type { Service, ServiceStatusUpdate, LogLine } from "./types";

export async function listServices(): Promise<Service[]> {
  if (USE_FIXTURES) return FIXTURE_SERVICES;
  return FIXTURE_SERVICES;
}

export async function startService(_id: string): Promise<void> {
  // Phase 3+: invoke<void>("start_service", { id })
}
export async function stopService(_id: string): Promise<void> {
  // Phase 3+: invoke<void>("stop_service", { id })
}
export async function restartService(_id: string): Promise<void> {
  // Phase 3+: invoke<void>("restart_service", { id })
}

export async function getLog(_id: string): Promise<LogLine[]> {
  return [];
}
export async function saveLog(_id: string): Promise<string> {
  return "";
}
export async function clearLog(_id: string): Promise<void> {}

/** Live status pushes (~1-2s per service). Returns an unsubscribe fn. No-op under fixtures. */
export function onServiceStatus(_cb: (u: ServiceStatusUpdate) => void): () => void {
  return () => {};
}

/** Live log lines for the expanded console. Returns an unsubscribe fn. No-op under fixtures. */
export function onServiceLog(_cb: (line: { id: string; line: LogLine }) => void): () => void {
  return () => {};
}
