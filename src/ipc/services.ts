// C5/C6 — service lifecycle, supervision, and logs (Phase 3). Backed by the
// Rust supervisor inside Tauri; fixtures in a plain browser.
import { invoke } from "@tauri-apps/api/core";
import { backendActive } from "./index";
import { FIXTURE_SERVICES } from "./fixtures";
import type { Service, ServiceStatusUpdate, LogLine, LogEntry, LogColor } from "./types";

export async function listServices(): Promise<Service[]> {
  if (backendActive) return invoke<Service[]>("list_services");
  return FIXTURE_SERVICES;
}

export async function startService(id: string): Promise<void> {
  if (backendActive) return invoke<void>("start_service", { id });
}
export async function stopService(id: string): Promise<void> {
  if (backendActive) return invoke<void>("stop_service", { id });
}
export async function restartService(id: string): Promise<void> {
  if (backendActive) return invoke<void>("restart_service", { id });
}

export async function getLog(id: string): Promise<LogLine[]> {
  if (backendActive) return invoke<LogLine[]>("get_log", { id });
  return [];
}
export async function saveLog(id: string): Promise<string> {
  if (backendActive) return invoke<string>("save_log", { id });
  return "";
}
export async function clearLog(id: string): Promise<void> {
  if (backendActive) return invoke<void>("clear_log", { id });
}

// ---- events -------------------------------------------------------------------

function subscribe<T>(channel: string, cb: (payload: T) => void): () => void {
  if (!backendActive) return () => {};
  let unlisten: (() => void) | null = null;
  let cancelled = false;
  import("@tauri-apps/api/event").then(({ listen }) => {
    listen<T>(channel, (e) => cb(e.payload)).then((un) => {
      if (cancelled) un();
      else unlisten = un;
    });
  });
  return () => {
    cancelled = true;
    if (unlisten) unlisten();
  };
}

/** Live status pushes (~1.5s per live service + on every transition). */
export function onServiceStatus(cb: (u: ServiceStatusUpdate) => void): () => void {
  return subscribe<ServiceStatusUpdate>("service://status", cb);
}

/** Live log lines for the expanded console. */
export function onServiceLog(cb: (e: { id: string; line: LogLine }) => void): () => void {
  return subscribe<{ id: string; line: LogLine }>("service://log", cb);
}

// ---- presentation helpers -------------------------------------------------------

const SEVERITY_COLOR: Record<LogLine["severity"], LogColor> = {
  info: "g",
  ok: "g",
  warn: "y",
  error: "r",
  plain: "",
};

/**
 * Convert a structured LogLine into the console's colored-part tuples. When the
 * line starts with a short severity token (INFO, npm ERR!, ✓ …) only the token
 * is tinted, mirroring the prototype's look; otherwise warn/error lines are
 * tinted whole.
 */
export function toLogEntry(l: LogLine): LogEntry {
  const color = SEVERITY_COLOR[l.severity];
  if (!color) return [l.ts, [[l.text, ""]]];
  const space = l.text.indexOf(" ");
  const token = space > 0 ? l.text.slice(0, space) : "";
  if (token && token.length <= 12 && /(info|warn|error|err!|✓|ready)/i.test(token)) {
    return [l.ts, [[token + " ", color], [l.text.slice(space + 1), ""]]];
  }
  return [l.ts, [[l.text, l.severity === "error" || l.severity === "warn" ? color : ""]]];
}
