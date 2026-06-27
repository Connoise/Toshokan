# Toshokan — Development Plan

> **Companion to `HANDOFF.md`.** HANDOFF is the *design + engineering spec* (authoritative for
> look, data shapes, and IPC contracts). This file is the *actionable build plan*: it locks the
> open decisions, resolves the questions raised during planning, adds the new **project-update**
> capability, and lays out a phased roadmap adapted to those decisions.
>
> When the two disagree, the resolution here wins (it is newer and decision-bearing); when this
> file is silent, HANDOFF governs.

---

## 0. Locked decisions (from the design Q&A)

| # | Topic | Decision |
|---|---|---|
| 1 | **Platform** | Cross-platform Tauri 2 — **Windows 11 *and* Linux**. Primary daily use is **Linux**. The supervisor is written cross-platform from day one (not Windows-only). |
| 2 | **Repo** | Build Toshokan **in this repo**. The prototype, HANDOFF, the dev-doc HTML, and `Readmes/` are kept as a **design record** (moved under `design/`). |
| 3 | **Targets** | The seven listed projects are **real, developed repos** on disk. |
| 4 | **Integration model** | Per-project **manifest** (`toshokan.yml`), but it may live **either in the project repo or in Toshokan's own config as an "overlay."** No other repo must be touched to integrate it. (See §3.) |
| 5 | **Sequencing** | Keep HANDOFF's phased order — catalog + notes land before live services, which is the lower-risk, better-organized path. (See §7.) |
| 6 | **Services** | **Supervise local processes only.** Remote/production deployments are modeled as local dev invocations and/or link-out entries. |
| 7 | **Scheduled jobs** | First-class **`job`** service kind showing **last-run / next-run** instead of uptime. |
| 8 | **systemd vs spawn** | **Raw spawn as a tracked child** (resolved — see §4.1). systemd integration deferred. |
| 9 | **Discovery** | **Layered + confirmed detection** (resolved — see §4.2). Nothing auto-launches. |
| 10 | **Env** | At launch, Toshokan **reads the project's `.env`** and injects it into the child. Secrets never enter Toshokan's own config. |
| 11 | **Logs** | **Persisted to disk** (rotating per-service file) in addition to the in-memory ring buffer. |
| 12 | **Notes** | A **configured Obsidian vault root**; match `<ProjectName>.md`, read-only. |
| 13 | **Git depth** | branch · remote/"Local only" · dirty count · **ahead/behind** · last commit (the ahead/behind powers the update feature). |
| 14 | **Markdown** | **Full GFM renderer** for README/notes **plus** the existing short quick-reference summary card. |
| 15 | **Scan shape** | One **parent "Projects" directory** holding one project dir each; subprojects one level deeper. Defaults to a single root; multi-root capability retained. |
| 16 | **Rescan** | **Live filesystem watch**, debounced and shallow (low RAM), updating the catalog + "Last Refresh." |
| 17 | **Editor** | Default editor is **VS Code** (`code <path>`). |
| 18 | **Command palette** | **Simpler option** — navigation + launch/start/stop/open only. No arbitrary shell. |
| 19 | **Appearance** | **Basic options only** (theme · density · rail emblem). The dev Tweaks panel is **not shipped**. |
| 20 | **Assets** | Produce the scriptable ones **now** (`.ico`, empty-state SVG, Megane subproject icon). "Xhungus" is unconfirmed (see §9). |
| + | **NEW: Updates** | Per-project **"Check for updates & update"** via the project's git remote — new capability **C9** (see §5). |

---

## 1. What we are building (recap)

A **local-first desktop launcher and control room** (図書館, "library"): one native window to find,
understand, launch, and monitor every project on the machine. Thin React/TypeScript WebView over a
Rust core; the UI never touches the OS — it `invoke()`s typed commands and `listen()`s for pushed
events. 100% local: no accounts, no cloud, no telemetry.

The seven catalogued projects (Idolmancer, Jagaimo, Sando, Plastiglom, Frog Budget, Inventorois,
Kani-miso) are the **integration targets** — Toshokan scans, summarizes, launches, supervises, and
updates them. Their per-project service definitions are seeded in §8.

---

## 2. Repository layout (target)

The new app is built at the repo root; the design materials move under `design/` so they remain a
visual-regression reference and historical record without colliding with the app.

```
Toshokan/
├─ PLAN.md                      ← this plan
├─ HANDOFF.md                   ← design + engineering spec (record)
├─ README.md                    ← new: how to build/run Toshokan
├─ design/                      ← design record (was repo root)
│  ├─ Toshokan Development Doc.html
│  ├─ Toshokan.html             ← runnable prototype entry
│  ├─ prototype/                ← the *.jsx prototype (was toshokan/)
│  └─ Readmes/                  ← integration-target READMEs
│
├─ index.html                   ← Vite entry
├─ package.json · vite.config.ts · tsconfig.json · .eslintrc
├─ public/                      ← fonts (self-hosted), favicons
├─ assets/                      ← icons/art imported by the app (from prototype/assets)
├─ src/                         ← React + TypeScript frontend
│  ├─ main.tsx · App.tsx
│  ├─ theme/tokens.css          ← ported verbatim from prototype
│  ├─ components/               ← Icon, Node, SpecimenFrame, chips, buttons, Toast …
│  ├─ pages/                    ← Projects, Project, Services, Settings
│  ├─ ipc/                      ← typed invoke()/listen() wrappers (the data layer)
│  │  ├─ types.ts               ← §5 data shapes (single source of truth)
│  │  ├─ projects.ts · services.ts · fsview.ts · summary.ts · config.ts · updates.ts
│  │  └─ fixtures.ts            ← prototype data behind USE_FIXTURES
│  └─ lib/                      ← formatting, markdown render, keybindings
│
└─ src-tauri/                   ← Rust core
   ├─ Cargo.toml · tauri.conf.json · build.rs
   ├─ icons/                    ← generated .ico/.png set
   └─ src/
      ├─ main.rs · commands.rs  ← #[tauri::command] surface (C1–C9)
      ├─ config.rs              ← load/save settings + per-project overlays
      ├─ scanner.rs             ← walk dirs → projects (+ notify watcher)
      ├─ meta.rs                ← stack detection · git (git2) · yaml/manifest parse
      ├─ fsview.rs              ← lazy dir list + file preview
      ├─ supervisor/            ← desktop-only process manager (behind a cfg boundary)
      │  ├─ mod.rs · proc.rs    ← spawn/track/signal; cross-platform process-tree kill
      │  ├─ sample.rs           ← sysinfo telemetry loop
      │  └─ logbus.rs           ← ring buffer + disk persistence + severity parse
      ├─ updater.rs             ← C9 git fetch / ff-only pull
      └─ sys.rs                 ← open editor/terminal/folder/browser/notes; clipboard
```

**Front-end port rule:** the prototype components carry final visual design. Port them to `.tsx`
with imports (drop in-browser Babel + CDN React), keep the inline-style approach and `tokens.css`
**verbatim**, and replace the `window.TSK_*` globals with the `src/ipc/*` data layer returning the
exact §5 shapes. Components stay largely untouched. Fixtures (`data.js` → `fixtures.ts`) live behind
a `USE_FIXTURES` flag as the visual-regression baseline.

---

## 3. Integration model — how a project declares itself (resolves Q4A)

**The problem:** option B (a `toshokan.yml` per project) is right, but the seven projects live in
separate repos and we don't want development to require coordinating eight repos at once.

**The resolution — a manifest with an overlay fallback.** A project's launch/service/notes
definition is resolved in this precedence order:

1. **In-repo `toshokan.yml`** at the project root (committed by that project) — authoritative.
2. **Toshokan overlay** — the same manifest stored in *Toshokan's own config dir*, keyed by project
   id/path. Editable from the UI's **"Configure services"** panel. **This is the default path** and
   requires touching **zero** other repos.
3. **Auto-detected suggestions** (§4.2) — surfaced as unconfirmed; confirming one writes it to the
   overlay (2).

So Toshokan can be developed and made fully functional against the real projects **entirely from its
own config** — no PRs to Idolmancer/Sando/etc. If you later decide a project *should* carry its own
manifest, an **"Export manifest to project"** action writes a `toshokan.yml` into that repo (the only
write Toshokan ever makes into a target repo, and only on explicit request). The overlay then defers
to it.

The overlay manifests for all seven projects are pre-seeded from the READMEs in **§8**, so the
catalog is populated and launchable on first run without any manual authoring.

### `toshokan.yml` / overlay schema

```yaml
name: Plastiglom
launch: python -m plastiglom.apps.web_app --host 127.0.0.1 --port 8001  # the headline "Launch"
notes: vault                     # "vault" (use the configured Obsidian root) | a path | omit for README
env: [".env"]                    # files to load into service children (default: .env if present)
update:
  remote: origin                 # git remote to fetch
  install: "pip install -e ."    # optional post-update step, OFF unless confirmed
services:
  - name: Web App
    kind: server                 # server | daemon | job
    command: python -m plastiglom.apps.web_app --host 127.0.0.1 --port 8001
    port: 8001
    cwd: .                       # relative to project root
  - name: LLM Scheduler
    kind: job
    command: python -m plastiglom.apps.llm_scheduler run
    schedule: "0 * * * *"        # cron → drives next-run; last-run read from state/log
    lastRunFrom: logs/llm_scheduler_state.json
```

---

## 4. Resolved architecture decisions

### 4.1 systemd vs. raw spawn (resolves Q8A) → **raw spawn, tracked child**

Toshokan **spawns the service command itself** as a tracked child process and owns its lifecycle.
Rationale:

- **Cross-platform.** Linux is primary but Windows is in scope; Windows has no systemd. One model
  works everywhere.
- **Ownership.** PID capture, stdout/stderr piping, per-PID CPU/RAM sampling, and exit detection all
  require owning the child — `systemctl start` hands the process to PID 1 and we'd lose all of it.
- **Scope.** The systemd units in the READMEs (`reminder-daemon.service`, `sando-web.service`,
  Jagaimo's Caddy) describe the **production deployment on a remote always-on host**, which is
  explicitly out of scope (Q6A: local only). Locally, the same command runs fine as a child.

systemd/`systemctl` adoption is a possible later mode (a manifest `manager: systemd` flag) but is
**not in v1**.

**Cross-platform process-tree kill** (dev servers spawn children):
- **Linux:** spawn in a new session/process group (`setsid`); stop = `SIGTERM` to the group →
  `SIGKILL` after a timeout (`killpg`).
- **Windows:** spawn with `CREATE_NO_WINDOW` (no console flash) assigned to a **Job Object**; stop =
  terminate the job (kills the whole tree), with `taskkill /T /F` as the fallback.
- **On app quit: stop every supervised child — never leak processes.**

### 4.2 Service discovery without a manifest (resolves Q9A) → **layered + confirmed**

Predictability beats magic. Resolution:

1. If a manifest exists (in-repo or overlay), **use it** — no guessing.
2. Otherwise, detect **candidate** services and present them in the "Configure services" panel as
   **suggestions that do not run until confirmed**:
   - `package.json` scripts named `dev` / `start` / `serve` / `preview` → server candidates (port
     parsed from the script or Vite/Next defaults).
   - Python: `uvicorn`/`fastapi`/`flask` imports, `__main__` modules, `manage.py` → server/daemon.
   - `Cargo.toml` (`[[bin]]`) → `cargo run` candidate.
   - `Caddyfile`, `docker-compose.yml` → server candidates.
3. Confirming a suggestion writes it to the overlay (§3.2). Nothing is ever auto-launched.

### 4.3 Concurrency & events (unchanged from HANDOFF §4)

Tokio; scans/spawns/sampling are async and never block the UI. A ~1–2s sampling loop emits
`service://status`; `logbus` emits `service://log` as output arrives; the scanner emits
`scan://progress`. Shared runtime state behind `Arc<Mutex<Supervisor>>` in Tauri managed state.

A new channel for C9:

| Channel | Payload | Consumer |
|---|---|---|
| `update://progress` | `{ id, phase: "fetch"\|"pull"\|"install"\|"done"\|"error", message }` | Project update button/toast |

The supervisor + logbus + sampler live behind a **`#[cfg]`/capability boundary** so a future mobile
build (catalog/notes viewer only) compiles without them.

---

## 5. NEW capability — C9 · Project updates (git sync)

A per-project **"Check for updates"** → **"Update"** flow, surfaced on the Description page identity
card (and in tile/row "more actions"). It uses the project's own git remote (`origin` by default);
no GitHub API is required for the pull itself — `git2`/libgit2 fetches over the repo's configured
HTTPS or SSH remote using the system credential helper / ssh-agent.

**Behavior (safe by construction):**

1. **Check** — `git fetch <remote>`, then compute `ahead` / `behind` vs the upstream of the current
   branch, plus working-tree `dirty`. Surface a mini changelog of the **incoming** commits
   (short hash + summary) so you see what would land.
2. **Update** — only offered when **behind, clean, and not diverged**:
   - clean + behind + not diverged → **`git pull --ff-only`** (fast-forward only; never a merge,
     never a force).
   - **dirty** working tree → refuse, warn "commit or stash first," offer "Open terminal."
   - **diverged** (local commits the remote lacks) → refuse FF, warn, offer "Open terminal."
3. **Post-update** — re-run git/stack enrichment (branch, last commit, ahead/behind) and refresh the
   project; if the manifest defines `update.install` **and** the user opts in (off by default), run
   it once as a tracked one-shot with streamed output. A running service is **not** auto-restarted —
   the UI offers "Restart affected services."

**Guards:** confirm before pulling; never operate outside the configured workspace roots; never
`git reset`/force/checkout-over-changes; treat a non-git project as "Updates unavailable."

**IPC (C9):**
```ts
interface UpdateStatus {
  isGit: boolean; remote: string | null; branch: string;
  ahead: number; behind: number; diverged: boolean; dirty: boolean;
  incoming: { hash: string; summary: string; author: string; date: string }[];
}
invoke<UpdateStatus>("check_updates", { id: string })                // git fetch + compare
invoke<void>("update_project", { id: string, runInstall?: boolean }) // ff-only pull; emits update://progress
```

---

## 6. Capability map (C1–C9) & build status

C1–C8 are the HANDOFF contracts (unchanged shapes); the notes below record how the locked decisions
land on them. C9 is new.

| Cap | Capability | Key decisions applied |
|---|---|---|
| **C1** | Directory scanning & discovery | Single parent root by default (Q15); **live notify watcher**, debounced/shallow (Q16); cache for instant cold start. |
| **C2** | Metadata enrichment | Stack detect; **git via git2** with branch · remote · dirty · **ahead/behind** · last commit (Q13). |
| **C3** | Summary / notes | **Configured Obsidian vault root** (Q12); `<ProjectName>.md` match, read-only; **full GFM render + short summary card** (Q14). |
| **C4** | Directory cross-section & preview | Lazy list + file-head preview for **all** projects (removes the Idolmancer-only placeholder). |
| **C5** | Service lifecycle (CORE) | **Local only** (Q6); **raw spawn** tracked child (Q8); cross-platform tree-kill; **job kind** with last/next-run (Q7); read **`.env`** into children (Q10). |
| **C6** | Log capture & streaming | In-memory ring **+ persisted rotating file on disk** (Q11); severity parse; save/clear. |
| **C7** | System actions | **VS Code** editor default (Q17); reveal folder / open URL / terminal / clipboard, cross-platform. |
| **C8** | Settings persistence | Config + per-project **overlays** (§3); **basic appearance only** (Q19); adds `vaultRoot`, update prefs. |
| **C9** | **Project updates (git sync)** | **NEW** (§5): check-for-updates + ff-only pull, dirty/diverged guards, optional install. |

### Config shape additions (C8)

```jsonc
{
  "version": 1,
  "directories": [ { "path": "~/Projects", "autoScan": true } ],   // single parent by default (Q15)
  "appearance": { "theme": "light", "density": "regular", "railEmblem": true },
  "vaultRoot": "~/Obsidian/Vault",                                  // Q12
  "tools": {                                                        // Q17 — cross-platform commands
    "editor":   { "linux": "code {path}", "windows": "code {path}" },
    "terminal": { "linux": "x-terminal-emulator", "windows": "wt -d {path}" },
    "browser":  "default", "fileManager": "default"
  },
  "management": { "restoreSession": true, "rescanOnLaunch": false, "confirmStop": true },
  "updates": { "confirmBeforeUpdate": true, "runInstallAfterUpdate": false },  // C9 defaults: cautious
  "projects": {                                                     // per-project overlays (§3)
    "plastiglom": { "manifest": { /* …§3 schema… */ } }
  },
  "session": { "lastTab": "projects", "lastProjectId": "idolmancer" }
}
```
Secrets are **never** stored here — only the *instruction* to load a project's `.env` at launch.

### Data-shape additions (§5 of HANDOFF, extended)

```ts
type ServiceKind = "server" | "daemon" | "job";
interface Service { /* …existing… */
  kind: ServiceKind;
  // job-only:
  schedule?: string | null;        // cron expression → next-run
  lastRun?: string | null;         // humanised
  nextRun?: string | null;         // computed from schedule
}
interface Project { /* …existing… */
  git?: { branch: string; remote: string; dirty: boolean; ahead: number; behind: number;
          lastCommit?: { hash: string; summary: string; date: string } };
  summary?: Summary;               // Summary.markdown now always populated for the full renderer
  updatable?: boolean;             // is a git project with a remote
}
```
The Services table gains job-aware cells: **Uptime** shows `next-run in 12m` / `last run 3h ago` for
`kind: "job"`; Port/PID/RAM read "—" for jobs that aren't currently executing.

---

## 7. Phased roadmap

Each phase leaves the app runnable & demoable. Order follows HANDOFF (Q5A) with C9 folded into the
actions phase and assets into packaging.

- **Phase 0 — Foundation & UI port.** Tauri 2 + Vite + TS scaffold (Win + Linux targets); port the
  prototype to `.tsx` verbatim; move design files to `design/`; stand up `src/ipc/*` returning §5
  shapes from `fixtures.ts` behind `USE_FIXTURES`; define all types incl. the §6 additions.
  *Exit:* native window renders the full prototype on both OSes through the data layer; the Tweaks
  panel is gone, replaced by real Settings appearance controls.

- **Phase 1 — Discovery & settings (C1, C8).** Config load/save + per-project overlays; the parent
  "Projects" root drives real scanning; **live notify watcher** + "Last Refresh"; project cache;
  root selector reflects configured roots. *Exit:* real projects from disk; settings persist.

- **Phase 2 — Project detail (C2, C3, C4).** Stack + git (incl. ahead/behind); **Obsidian-vault
  summary + full GFM README render + short summary card**; lazy tree & preview for **all** projects.
  *Exit:* Description page fully live; no "Idolmancer-only" placeholder.

- **Phase 3 — Services, the core (C5, C6).** Cross-platform supervisor (raw-spawn tracked children,
  tree-kill, sample telemetry, detect exits), `.env` injection, **job kind** (last/next-run), status
  events, log piping/parse/stream + **disk persistence**/save/clear. Wire project state nodes +
  header count to the supervisor. *Exit:* a real dev server (e.g. Frog Budget `npm run dev`) starts,
  runs, logs, and stops from the UI with accurate live telemetry; Inventorois reproduces the
  port-in-use **failed** state from the fixture.

- **Phase 4 — Actions, updates & palette (C7, C9).** External launches (VS Code, terminal, folder,
  browser, notes) + clipboard; **C9 check-for-updates / ff-only pull** with the dirty/diverged
  guards and incoming-commit changelog; simple command palette (nav + launch/start-stop, Q18);
  session restore; honour `confirmStop` / `rescanOnLaunch` / density. *Exit:* every prototype toast
  is replaced by a real action, and any project can be updated from its git remote.

- **Phase 5 — Packaging & assets.** Linux bundle (AppImage/.deb) **and** Windows installer (MSI/NSIS)
  via the Tauri bundler; generate the **`.ico`** + icon set; ship the **empty-state SVG** and the
  **Megane subproject icon**; spawn without console windows; verify no process leaks on quit.
  *Exit:* installable signed builds for Linux and Windows.

---

## 8. Per-project service seed (overlay manifests, derived from the READMEs)

Pre-seeded so the catalog is launchable on first run (Q3, §3). `kind` and locality reflect Q6/Q7:
**server/daemon** = supervised local child; **job** = on-demand one-shot with last/next-run;
**link** = remote production deployment, opened in browser, not supervised.

| Project | Service (role) | kind | Local command (cwd) | Port | Env | Notes |
|---|---|---|---|---|---|---|
| **Idolmancer** (TS/React/Tauri, pnpm) | Shell dev | server | `pnpm dev` | 5173 | — | monorepo; `pnpm install` as `update.install` |
| | Idolmancy–Megane (subproject) | server | `pnpm --filter megane dev` (`idolmancy-Megane/`) | 3001 | — | subproject icon needed |
| **Jagaimo** (Py core + React viewer) | Viewer dev | server | `npm run dev` (`viewer/`) | 5173 | `viewer/.env` (`VITE_SUPABASE_*`) | |
| | Ingest snapshot | **job** | `.venv/bin/python ingest.py` (`core/`) | — | `core/.env` | cron `*/15 * * * *`; last-run from `core/ingest.log` |
| | Tailnet viewer (Caddy) | **link** | — | tailnet :443 | — | production on remote host → open URL only |
| **Sando** (FastAPI + daemon) | Web app | server | `python -m uvicorn sando_web.app:app --host 127.0.0.1 --port 8765` | 8765 | `SCHEDULE_DIR` | systemd in prod; raw-spawn locally |
| | Reminder daemon | daemon | `python reminder_daemon.py` | — | `TELEGRAM_*`, `REMINDERS_FILE` | |
| **Plastiglom** (Py + Claude API) | Web app | server | `python -m plastiglom.apps.web_app --host 127.0.0.1 --port 8001` | 8001 | `PLASTIGLOM_VAULT_PATH`, `ANTHROPIC_API_KEY` | |
| | Scheduler fire | **job** | `python -m plastiglom.apps.scheduler` | — | vault env | cron 07:30 / 21:00 |
| | LLM scheduler | **job** | `python -m plastiglom.apps.llm_scheduler run` | — | `ANTHROPIC_API_KEY` | cron hourly; last-run from `logs/llm_scheduler_state.json` |
| **Frog Budget** (React/TS/Vite) | Dev server | server | `npm run dev` | 5173 | `.env` (`VITE_SUPABASE_*`) | `npm install` as `update.install` |
| **Inventorois** (React/TS/Vite) | Dev server | server | `npm run dev` | 3000 | `.env` (`VITE_SUPABASE_*`) | port-in-use = failed-state test case |
| **Kani-miso** (Py + SQLite + Claude) | Capture processor | daemon | `python scripts/processor.py` | — | `config/.env` (`ANTHROPIC_API_KEY`) | queue worker |

(Headline **Launch** per project = its primary `server`, else its first service; notes resolve to
the Obsidian vault when `notes: vault`, else the in-repo README.)

---

## 9. Assets (Q20)

Produce now (scriptable / authorable in-house, no external design dependency):

- **Windows `.ico`** (16/32/48/256) + the full Tauri icon set, generated from the existing
  `app-icon.png` master — needed for the Windows build.
- **Empty-state illustration** — author as **SVG** in the Lithic style for the "no project selected"
  state (replaces the `illustration: empty survey field` slot in `page-project.jsx`).
- **Idolmancy–Megane subproject icon** — the one real subproject in the fixtures; derive a specimen
  octagon icon (+ `-dark`) consistent with the existing set.

Defer / confirm:

- **"Xhungus"** appears as a needed subproject icon in `ASSETS.md` but **does not exist in `data.js`
  or any README.** Flagged for confirmation before any art is produced — likely a stale placeholder.

Already done (kept): 7 project icons (+`-dark`), app/brand mark, rail emblem (`toshokan/assets/`).

---

## 10. Errors, testing, packaging (deltas from HANDOFF §8)

- **Error handling** — as HANDOFF, plus C9: dirty/diverged → refuse FF with guidance; fetch auth
  failure → toast "check credentials," keep last-known-good; install step failure → surface output,
  leave the pulled code in place.
- **Cross-platform supervisor tests** — process-group kill on Linux *and* Job-Object kill on
  Windows; assert no orphaned children after stop/quit on both.
- **C9 tests** — temp git repos: fast-forwardable → pulls; dirty → refused; diverged → refused;
  non-git → unavailable; incoming-commit changelog correctness.
- **Job-kind tests** — cron → next-run computation; last-run parsed from a state file/log.
- **Packaging** — **both** Linux (AppImage/.deb) and Windows (MSI/NSIS) via the Tauri bundler;
  primary local development & QA on **Linux**.

---

## 11. Open items

1. ~~**"Xhungus"** subproject~~ — **resolved:** project archived, icon dropped (§9).
2. ~~**`update.install` opt-in toggle**~~ — **resolved:** confirmed, default **off** (cautious).
3. **Obsidian vault path** — the actual `vaultRoot` to seed in config (can be set later in Settings).
4. **Projects parent directory** — the actual path/name of the parent that holds the project dirs
   (Q15 says it exists but the exact path is TBD); defaults can ship and be edited in Settings.

> Items 3–4 are real paths on your machine; sensible defaults ship now and are editable in Settings,
> so they don't block development.

---

*Build order: §7. Contracts: HANDOFF §5–§6 + this §5–§6. Look & behavior: the prototype is
authoritative; intent: HANDOFF callouts; decisions: this file.*
