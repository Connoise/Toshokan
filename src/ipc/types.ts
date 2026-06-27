// Toshokan — shared data shapes.
// Single source of truth for the UI <-> core contract (HANDOFF §5 + PLAN §6).
// Mirror these as Rust structs (#[derive(Serialize, Deserialize)] + camelCase rename).

// ---- Projects ---------------------------------------------------------------

export interface Subproject {
  name: string;
  desc: string;
  lastOpened: string;
  path?: string;
}

export interface Summary {
  source: string;
  updated: string;
  paragraphs: string[]; // short quick-reference summary (rendered as the summary card)
  markdown?: string; // full README/notes body for the GFM renderer (PLAN Q14)
}

export interface GitInfo {
  branch: string;
  remote: string; // "Local only" when there is no remote
  dirty: boolean;
  ahead: number;
  behind: number;
  lastCommit?: { hash: string; summary: string; date: string };
}

export interface Project {
  id: string;
  name: string;
  desc: string;
  tech: string[];
  path: string;
  lastOpened: string; // humanised
  lastOpenedAt?: number; // raw epoch (sort)
  sortKey: number;
  branch: string;
  repo: string; // "Local only" or remote name
  serviceCount: number;
  subprojects: Subproject[];
  service?: { label: string; url: string }; // optional headline running service
  summary?: Summary;
  git?: GitInfo;
  updatable?: boolean; // is a git project with a remote (drives the C9 update affordance)
}

// ---- Services ---------------------------------------------------------------

export type ServiceState = "running" | "starting" | "stopped" | "failed";
export type ServiceKind = "server" | "daemon" | "job";

// Prototype log format: [time, [[text, colorCode], ...]] — kept as the visual baseline.
// Production streams structured LogLine{severity}; the UI maps severity -> color.
export type LogColor = "g" | "b" | "y" | "r" | "";
export type LogPart = [text: string, color?: LogColor];
export type LogEntry = [time: string, parts: LogPart[]];

export interface LogLine {
  ts: string;
  severity: "info" | "ok" | "warn" | "error" | "plain";
  text: string;
}

export interface ServiceDetail {
  launchCommand: string;
  workingDir: string;
  localUrl: string | null;
  started: string;
  user: string;
  environment: string;
  log: LogEntry[];
}

export interface Service {
  id: string;
  name: string;
  role: string;
  projectId: string;
  projectName: string;
  projectDesc: string;
  runtime: string;
  command: string;
  port: string | null;
  pid: string | null;
  uptime: string | null;
  ram: number | null; // MB
  status: ServiceState;
  kind: ServiceKind; // PLAN Q7
  // job-only (PLAN Q7): scheduled tasks show last/next-run instead of uptime
  schedule?: string | null; // cron expression
  lastRun?: string | null;
  nextRun?: string | null;
  error?: { code: string; message: string; time: string };
  detail: ServiceDetail;
}

export interface ServiceStatusUpdate {
  id: string;
  status: ServiceState;
  pid: string | null;
  port: string | null;
  uptimeSec: number | null;
  ramMb: number | null;
}

// ---- Filesystem cross-section ----------------------------------------------

export interface TreeNode {
  name: string;
  type: "dir" | "file";
  modified: string;
  size?: string;
  kind?: string;
  running?: boolean;
  children?: TreeNode[];
}

export interface FilePreview {
  kind: string;
  size: string;
  modified: string;
  lines: string[];
}

// ---- Updates (C9, PLAN §5) --------------------------------------------------

export interface UpdateStatus {
  isGit: boolean;
  remote: string | null;
  branch: string;
  ahead: number;
  behind: number;
  diverged: boolean;
  dirty: boolean;
  incoming: { hash: string; summary: string; author: string; date: string }[];
}

// ---- Config / settings (C8, PLAN §6) ----------------------------------------

export type ThemeName = "Lithic Light" | "Basalt Dark";
export type Density = "regular" | "compact";

export interface Appearance {
  theme: ThemeName;
  density: Density;
  railEmblem: boolean;
}

export interface WorkspaceDirectory {
  path: string;
  autoScan: boolean;
}

export interface ManagementPrefs {
  editor: string;
  terminal: string;
  defaultBranch: string;
  restoreSession: boolean;
  rescanOnLaunch: boolean;
  confirmStop: boolean;
}

export interface UpdatePrefs {
  confirmBeforeUpdate: boolean;
  runInstallAfterUpdate: boolean;
}

export interface Config {
  version: number;
  directories: WorkspaceDirectory[];
  appearance: Appearance;
  vaultRoot: string | null;
  management: ManagementPrefs;
  updates: UpdatePrefs;
  session: { lastTab: string; lastProjectId: string | null };
}

export interface ScanProgress {
  root: string;
  found: number;
  done: boolean;
}
