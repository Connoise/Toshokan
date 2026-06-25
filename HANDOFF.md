# Toshokan — Handoff to Claude Code

> **Entry point for development.** This bundle contains a high-fidelity **interface
> prototype** (HTML/React) and a designed **development guide**. Your job is to
> recreate the interface inside a **Tauri** desktop app and build the local backend
> specified below. The prototype files are *design references*, not production code
> to ship as-is.

**Read these together:**

| File | What it is |
|---|---|
| `Toshokan Development Doc.html` | The full designed spec — open in a browser. Richest source for the **design system, every screen, and visual detail** (with screenshots). |
| `Toshokan.html` + `toshokan/` | The runnable React prototype (the interface to recreate). Open `Toshokan.html`. |
| `HANDOFF.md` (this file) | The engineering spec in markdown: domain model, gap map, architecture, **data shapes, IPC contracts, roadmap**. |
| `toshokan/ASSETS.md` | Asset manifest + outstanding art. |

Fidelity: **hi-fi.** Colors, type, spacing, and interactions are final — recreate the UI faithfully. Use the target project's own component conventions where they exist.

---

## 1. What Toshokan is

Toshokan (図書館, "library") is a **local-first desktop launcher and control room** for a
developer's personal workspace: one native window to find, understand, launch, and
monitor every project on the machine.

**Goals:** one catalog of every local project (scanned from configured directories);
understand a project at a glance (README/notes, directory tree, git, services); start /
stop / restart and live-monitor its dev processes ("services"); fast & keyboard-driven;
**100% local — no accounts, no cloud, no telemetry.**

**Non-goals:** not an editor/IDE (it *launches* them); not a cloud/team tool; not a
deploy/CI system; not a VCS client (reads git, runs configured commands only).

**Target:** Tauri (Rust core + system WebView) on **Windows 11**. Android is a possible
later track, explicitly out of scope for v1 (and the *Services* capability has no mobile
equivalent — see §8).

---

## 2. Domain model

```
Workspace Directory ──scans──▶ Project ──has 0..n──▶ Service
                                Project ──has 0..n──▶ Subproject (a nested Project)
                                Project ──links 0..1─▶ Summary Note (Obsidian/README)
```

- **Workspace Directory** — a registered root to watch (e.g. `~/Workspace`), with an
  auto-scan flag. *(user config)*
- **Project** — a discovered folder: identity, tech tags, path, git branch/repo,
  last-opened, optional summary. *(filesystem + git + config files)*
- **Subproject** — a project nested in another; structurally a Project. *(filesystem)*
- **Service** — a runnable, usually long-lived process a project defines (dev server,
  daemon, viewer) with a lifecycle state. *(project config + live process)*
- **Summary Note** — README and/or matching Obsidian note, rendered read-only.
- **Tree Node** — a file/dir entry for the directory cross-section.

The prototype ships 7 sample projects and 9 services covering every awkward case
(0/1/2 services, a subproject, and all four service states). Keep `toshokan/data.js`
as fixtures behind a `USE_FIXTURES` flag — it's the visual-regression baseline and the
contract the UI was built against.

---

## 3. Screens (summary — full detail + screenshots in the HTML doc)

1. **Shell** (`app.jsx`) — Win11 title bar *(replace with real Tauri window controls)*,
   196px nav rail (Projects · Description · Services · Settings), context header
   (title, workspace-root selector, search/command field, status chip, "N Services
   Active"), status strip. Shortcuts: `Ctrl/⌘+K` focus search, `Ctrl+1..4` switch tabs.
2. **Projects** (`page-projects.jsx`) — featured launch band + catalog as grid (specimen
   tiles) or list; sort, view toggle, search, empty state.
3. **Description** (`page-project.jsx`) — specimen tray (switcher), identity card +
   actions (open editor/dir/terminal/notes), summary panel, subprojects, directory
   cross-section + file preview. *(tree/preview are sample data for Idolmancer only.)*
4. **Services** (`page-services.jsx`) — table of every service with live state, an
   expandable detail drawer + colored log console. **The core of the app.**
5. **Settings** (`page-settings.jsx`) — appearance (theme/density/rail emblem),
   watched directories (+ auto-scan), project-management defaults, about.

### Gap map — what the prototype fakes → what the backend must do

| UI action / value | Prototype does | Backend must | Cap |
|---|---|---|---|
| Project catalog | static `TSK_PROJECTS` | scan dirs, build list | C1 |
| Tech tags · branch · repo | hard-coded | detect stack; read git | C2 |
| Summary / README | inline text | resolve README/Obsidian note; render md | C3 |
| Directory tree & file preview | sample (Idolmancer only) | read FS lazily; read file heads | C4 |
| Launch / Start / Stop / Restart | toasts + timers | spawn/signal real processes; supervise | C5 |
| PID · port · uptime · memory · state | random/seeded | sample live processes; push updates | C5 |
| Service log console | static lines | stream stdout/stderr via events | C6 |
| Open editor/terminal/folder/browser/notes | toasts | launch external apps / reveal / open URL | C7 |
| Workspace-root selector & "Last Refresh" | static | reflect registered roots + last scan | C1 |
| All Settings except appearance | local React state | persist to config; drive behavior | C8 |

---

## 4. Architecture (Tauri)

Thin React webview over a Rust core. The UI **never touches the OS** — it `invoke()`s
typed commands and `listen()`s for pushed events. All FS, git, and process work is in Rust.

**Rust modules:** `config` (load/save settings) · `scanner` (walk dirs → projects) ·
`meta` (stack/git/yaml/notes enrichment) · `fsview` (lazy dir list + file preview) ·
`supervisor` (process manager: spawn/track/signal/sample — owns runtime registry) ·
`logbus` (buffer + stream child stdout/stderr) · `sys` (open editor/terminal/folder/
browser/notes; clipboard).

**Concurrency:** Tokio. Scans, spawns, and sampling are async — never block the UI thread.
A ~1–2s sampling loop emits status snapshots; logbus emits as output arrives. Shared
runtime state behind Tauri managed state (`Arc<Mutex<Supervisor>>`).

**Events (Rust → UI):**

| Channel | Payload | Consumer |
|---|---|---|
| `service://status` | `ServiceStatusUpdate` | Services table, project state nodes, header count |
| `service://log` | `LogLine` | Expanded log console |
| `scan://progress` | `ScanProgress` (root, found, done) | Status strip, catalog refresh |

**Frontend integration:** compile the React tree with **Vite + TypeScript** (drop
in-browser Babel/CDN React). Replace `window.TSK_*` globals with an async data layer
(`src/ipc/*.ts`) wrapping `invoke()` and returning the exact shapes in §5, so components
are largely untouched. Subscribe to events in effects. Keep fixtures behind `USE_FIXTURES`.

```ts
// src/ipc/projects.ts
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export const listProjects = () => invoke<Project[]>("list_projects");
export const rescan = (root?: string) => invoke<void>("rescan", { root });
export function onServiceStatus(cb: (u: ServiceStatusUpdate) => void) {
  return listen<ServiceStatusUpdate>("service://status", e => cb(e.payload));
}
```

---

## 5. Data shapes

Return these from IPC (mirror as Rust structs with `#[derive(Serialize, Deserialize)]`
+ camelCase rename). They match the prototype's `data.js` exactly.

```ts
interface Project {
  id: string; name: string; desc: string;
  tech: string[]; path: string;
  lastOpened: string; lastOpenedAt: number;   // humanised + raw epoch (sort)
  sortKey: number;
  branch: string; repo: string; serviceCount: number;
  subprojects: Subproject[];
  service?: { label: string; url: string };   // optional headline running service
  summary?: Summary;
}
interface Subproject { name: string; desc: string; lastOpened: string; path?: string; }
interface Summary { source: string; updated: string; paragraphs: string[]; markdown?: string; }

type ServiceState = "running" | "starting" | "stopped" | "failed";
interface Service {
  id: string; name: string; role: string;
  projectId: string; projectName: string; projectDesc: string;
  runtime: string; command: string;
  port: string | null; pid: string | null;
  uptime: string | null; ram: number | null;   // MB
  status: ServiceState;
  error?: { code: string; message: string; time: string };
  detail: {
    launchCommand: string; workingDir: string; localUrl: string | null;
    started: string; user: string; environment: string;
    log: LogLine[];
  };
}
interface LogLine { ts: string; severity: "info"|"ok"|"warn"|"error"|"plain"; text: string; }

interface TreeNode {
  name: string; type: "dir" | "file"; modified: string;
  size?: string; kind?: string; running?: boolean; children?: TreeNode[];
}
interface FilePreview { kind: string; size: string; modified: string; lines: string[]; }

interface ServiceStatusUpdate {
  id: string; status: ServiceState;
  pid: string|null; port: string|null; uptimeSec: number|null; ramMb: number|null;
}
```

> The prototype's log lines are colored token tuples; production should send structured
> `LogLine{severity}` and let the UI map severity → color.

### Persistence

| Store | Location | Contents / lifetime |
|---|---|---|
| `config.json`/`.toml` | `app_config_dir()` | directories (+autoScan), appearance, management prefs, session. Persisted on change. |
| project cache | `app_cache_dir()` | last scan + last-opened, for instant cold start. Disposable. |
| service registry | in-memory | live process handles, PIDs, log ring-buffers. Rebuilt on launch. |

```json
// config.json
{
  "version": 1,
  "directories": [
    { "path": "~/Workspace", "autoScan": true },
    { "path": "D:\\Archive\\projects", "autoScan": false }
  ],
  "appearance": { "theme": "light", "density": "regular", "railEmblem": true },
  "management": {
    "editor": "VS Code", "terminal": "Windows Terminal", "defaultBranch": "main",
    "restoreSession": true, "rescanOnLaunch": false, "confirmStop": true
  },
  "session": { "lastTab": "projects", "lastProjectId": "idolmancer" }
}
```

---

## 6. Capabilities & IPC contracts (C1–C8)

`invoke` signatures are frontend-facing; mirror as `#[tauri::command]`.

### C1 · Directory scanning & project discovery
Walk each registered dir one level deep; treat a child as a project when it has `.git`,
`package.json`, `toshokan.yml`, `pyproject.toml`, `Cargo.toml`, or a README. Recurse one
extra level for subprojects. Build `Project` records (enrich via C2/C3). Cache; emit
`scan://progress`.
```ts
invoke<Project[]>("list_projects")            // cached, instant
invoke<void>("rescan", { root?: string })     // async; emits scan://progress
invoke<string>("last_refresh")                // ISO time of last scan
```
*Edge cases:* missing/denied roots → skip + warn; symlink loops → visited-set guard;
huge dirs → cap depth/fan-out, scan off-thread.

### C2 · Project metadata enrichment
Per project: detect stack; parse `toshokan.yml` for launch command + service defs; read
git (`HEAD` branch, remote/"Local only", dirty); compute last-opened. Prefer `git2`
(libgit2) over shelling out.
```ts
invoke<Project>("get_project", { id: string })
invoke<GitInfo>("git_info", { path: string })   // { branch, remote, dirty }
```

### C3 · Summary / notes (Obsidian) ingestion
Resolve the project README and/or a same-named note in the user's Obsidian vault. Return
render-ready markdown (+ paragraph array for the current renderer). **Never write to the vault.**
```ts
invoke<Summary | null>("get_summary", { id: string })
```

### C4 · Directory cross-section & file preview
Lazy: list one directory level on demand; read first N lines / KB of a text file (guard
binary & large files). Flag dirs hosting a running service (`running:true`).
```ts
invoke<TreeNode[]>("list_dir", { path: string })
invoke<FilePreview | null>("preview_file", { path: string, maxLines?: number })
```

### C5 · Service lifecycle & supervision  ← CORE
Spawn the service command in its working dir as a tracked child; on spawn capture PID and
`starting → running` (or `failed` with stderr). Stop = graceful signal then kill after
timeout; restart = stop+start. Sampling loop reads per-PID CPU/memory + uptime → emits
`service://status`. Detect unexpected exits → `failed` (exit code) or `stopped`.
```ts
invoke<void>("start_service",   { id: string })
invoke<void>("stop_service",    { id: string })
invoke<void>("restart_service", { id: string })
invoke<Service[]>("list_services")
// push: emit("service://status", ServiceStatusUpdate) every ~1–2s per live service
```
*Notes:* use a cross-platform process crate (e.g. `sysinfo` for sampling). On Windows,
spawn **without a console window** and **kill the whole process tree** (dev servers spawn
children). Honour `confirmStop` in the UI before calling `stop_service`.

### C6 · Log capture & streaming
Pipe child stdout/stderr; parse severity (INFO/OK/WARN/ERROR, Vite/uvicorn-style
prefixes) → `LogLine`; bounded ring-buffer per service (~1–2k lines); emit new lines on
`service://log`. Save = write buffer to file; Clear = empty it.
```ts
invoke<LogLine[]>("get_log", { id: string })   // backfill on drawer open
invoke<string>("save_log", { id: string })     // returns written path
invoke<void>("clear_log", { id: string })
```

### C7 · System actions
Launch external tools using the configured editor/terminal (C8) + OS defaults. Validate
paths; failures → toast.
```ts
invoke<void>("open_in_editor",  { path: string })
invoke<void>("open_terminal",   { path: string })
invoke<void>("reveal_in_files", { path: string })   // "Open Folder"
invoke<void>("open_url",        { url: string })     // service URL / notes
invoke<void>("copy_text",       { text: string })    // path / command chips
```

### C8 · Settings persistence
Read/patch the config file; changing `directories` may trigger a rescan.
```ts
invoke<Config>("get_config")
invoke<Config>("patch_config", { patch: Partial<Config> })
```

---

## 7. Phased roadmap

Each phase leaves the app runnable & demoable.

- **Phase 0 — Foundation & UI port.** Tauri + Vite + TS scaffold; port the React
  prototype; stand up `src/ipc/*` data layer returning §5 shapes from `data.js` fixtures
  behind `USE_FIXTURES`; define all types. *Exit:* native window renders the full
  prototype through the data layer.
- **Phase 1 — Discovery & settings (C1, C8).** Config load/save; directory manager drives
  real scanning; workspace-root selector + "Last Refresh" live; project cache. *Exit:*
  real projects from disk; settings persist.
- **Phase 2 — Project detail (C2, C3, C4).** Stack + git; README/Obsidian summary; lazy
  tree & preview for *all* projects. *Exit:* Description page fully live; no
  "Idolmancer-only" placeholder.
- **Phase 3 — Services, the core (C5, C6).** Supervisor (spawn/stop/restart, sample
  telemetry, detect exits), status events, log piping/parsing/streaming/save/clear. Wire
  project state nodes + header count to the supervisor. *Exit:* a real dev server starts,
  runs, logs, and stops from the UI with accurate live telemetry.
- **Phase 4 — Actions, command palette & polish (C7).** External launches + clipboard;
  "run command" search → command palette; session restore; honour `confirmStop`,
  `rescanOnLaunch`, density; tile/row "more actions" menus. *Exit:* every toast replaced
  by a real action.
- **Phase 5 — Packaging.** Windows installer + `.ico`, signing, optional auto-update;
  finish remaining art; evaluate Android. *Exit:* signed, installable Windows build.

---

## 8. Errors, testing, packaging

**Error handling** (commands return `Result`; UI toasts + keeps last-known-good):
missing/denied roots → skip+warn; symlink loops/huge trees → guard + cap + off-thread;
non-git → `repo:"Local only"`; no README → `null` empty state; binary/huge file → `null`;
command not found / non-zero exit → `failed` + stderr; port in use → failed start with
child's error (matches the Inventorois fixture); stop won't terminate → signal → timeout →
force-kill tree; **on app quit, stop all supervised services — never leak processes**;
corrupt config → back up, default, migrate by `version`.

**Testing:** Rust unit (detection, yaml/manifest parse, log-severity parser, config
migrate, formatting); Rust integration (scan a tempdir tree → assert `Project[]`; spawn a
trivial child → assert state transitions + no leak); frontend (components against
fixtures; data layer with `invoke` mocked); e2e (Tauri WebDriver: scan → open project →
start service → see logs → stop); manual QA (light/dark parity, reduced-motion, keyboard
nav, Windows 100–200% scaling — assets are 2×).

**Packaging (Windows v1):** Tauri bundler → MSI/NSIS; generate real `.ico` (16/32/48/256)
from the app-icon master; code-sign; optional updater; spawn without console windows; kill
process trees on stop/quit. **Android (later, out of scope):** Tauri 2 mobile — but
*Services* (process supervision) has no mobile equivalent, so a mobile build would be a
read-only catalog/notes viewer over the user's tailnet. Build the supervisor (C5/C6) as a
desktop-only module behind a capability boundary so mobile can compile without it.

---

## 9. Design system (essentials — full detail in the HTML doc, §3–§4)

- **"Digital Strata" / Lithic** — calm, instrument-grade, geological. Two themes via a
  single `data-theme` attribute: **Lithic Light** (default) + **Basalt Dark**. All tokens
  in `toshokan/tokens.css` — recreate verbatim.
- **Type:** Hanken Grotesk (UI/body/headings) + IBM Plex Mono (paths, ports, PIDs,
  commands, code, `.micro` labels). Commands render *italic* mono.
- **Key accents:** signal amber `#F0A84B` (selection/focus), running green `#57976C`,
  error `#A85348`, copper `#709B93` (doc "seam"), basalt `#23282B` (primary actions).
- **Motifs to preserve:** project tiles clip the **top-right** corner to 4px (the
  "specimen cut"); doc panels show a thin copper "seam" gradient on top.
- **State system** — the "mineral node" dot: running (solid green + halo), starting
  (amber + halo, pulsing, + row sweep), stopped (hollow ring), failed (solid red + red
  left-edge + error banner).
- **Icons rendered with `mix-blend-mode`** (multiply light / screen dark) over octagonal
  frames — **no separate selected/unselected backplate**; selection adds a signal glow.
- **Motion:** hover lifts (~150ms), `tsk-pulse`, `tsk-starting-sweep`; theme flip suppresses
  transitions for ~80ms so surfaces snap atomically; honour `prefers-reduced-motion`.

## 10. Assets

Done (512px masters + `-dark`, in `toshokan/assets/`): 7 project icons, app/brand mark,
rail emblem. Dark variants are generated by a **saturation-gated lightness inversion**
(neutral plaque/strokes invert; saturated art keeps hue). **Outstanding:** 2 subproject
icons (Idolmancy–Megane + future nested), an empty-state illustration (SVG or 600×340),
and a Windows `.ico` (16/32/48/256). Tech-logo glyphs were intentionally cut — tech chips
are text-only. See `toshokan/ASSETS.md`.

---

*When in doubt about look & behavior, the prototype is authoritative. When in doubt about
intent, the callouts in `Toshokan Development Doc.html` are. Build order: §7. Contracts: §5–§6.*
