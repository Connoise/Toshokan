# Toshokan 図書館

A **local-first desktop launcher and control room** for a developer's personal workspace: one
native window to find, understand, launch, and monitor every project on the machine. 100% local —
no accounts, no cloud, no telemetry.

Built with **Tauri 2** (Rust core + system WebView) and **React + TypeScript + Vite**. Cross-platform
(**Linux** and **Windows 11**).

> **Status: Phases 0–3 complete** — the full designed interface runs over a real Rust core:
> directory scanning + live watch (C1), settings persistence (C8), git/stack/notes/tree enrichment
> (C2–C4), and the service supervisor with log streaming (C5/C6). Remaining: system actions +
> project updates (Phase 4) and packaging (Phase 5). See **[PLAN.md](./PLAN.md)** for the roadmap and
> **[HANDOFF.md](./HANDOFF.md)** for the design + engineering spec. The original design prototype and
> source READMEs are kept under [`design/`](./design/).

## Architecture

```
src/            React + TypeScript frontend (the ported prototype)
  components/   shared UI library (Icon, Node, SpecimenFrame, chips, buttons, Toast)
  pages/        Projects · Project (Description) · Services · Settings
  ipc/          typed data layer — invoke()/listen() wrappers; types.ts is the contract
                (Phase 0: returns fixtures behind USE_FIXTURES)
  theme/        tokens.css — the "Digital Strata" design system (Lithic Light + Basalt Dark)
src-tauri/      Rust core (window now; scanner/meta/supervisor/updater/sys in later phases)
design/         design record: HTML dev doc, runnable prototype, project READMEs
```

The UI never touches the OS: it calls typed functions in `src/ipc/*`, which in later phases wrap
Tauri `invoke()` commands. Components stay untouched as the backend lands behind them.

## Develop

Requires **Node ≥ 20** and (for the native build) the
[Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/) — Rust + a system WebView
(`webkit2gtk` on Linux, WebView2 on Windows).

```bash
npm install

# Frontend only (runs in a browser at http://localhost:5180 — uses fixture data):
npm run dev

# Native desktop app (Tauri window over the Vite frontend):
npm run tauri dev

# Checks:
npm run typecheck   # tsc --noEmit
npm run lint        # eslint

# Production:
npm run build       # typecheck + Vite build -> dist/
npm run tauri build # packaged desktop app (generate icons first: npm run tauri icon)
```

## What works now (Phases 0–3)

- **Catalog from disk (C1/C8):** the scanner walks your configured Projects directory, detects
  projects by marker, and keeps the catalog live via a debounced filesystem watcher; all settings
  persist to `config.json` in the app config dir.
- **Project detail (C2–C4):** git branch / remote / dirty / ahead-behind / last commit (git2),
  README + Obsidian-vault summaries with a full GFM render, and a lazy directory tree + file
  preview for every project.
- **Services (C5/C6):** per-project services defined in `toshokan.yml` (or overlay manifests seeded
  into `<config>/manifests/`) are spawned as tracked children with the project's `.env` injected,
  supervised through starting/running/stopped/failed, tree-killed on stop and on app quit, sampled
  for RAM/uptime every ~1.5s, and their stdout/stderr streamed into the log console (severity
  colored, ring-buffered, persisted to disk, save/clear wired). Job-kind services show
  last-run/next-run from their cron schedule.
- Both themes, density + rail-emblem toggles, `Ctrl/⌘+K` search, `Ctrl+1..4` tabs, frameless window.

Remaining: Phase 4 (open-in-editor/terminal/folder, clipboard, the git update button, command
palette, session restore) and Phase 5 (packaging + icons). In a plain browser (`npm run dev`)
everything runs on fixture data; the real core needs the Tauri window (`npm run tauri dev`).
