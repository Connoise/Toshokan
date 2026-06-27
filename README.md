# Toshokan 図書館

A **local-first desktop launcher and control room** for a developer's personal workspace: one
native window to find, understand, launch, and monitor every project on the machine. 100% local —
no accounts, no cloud, no telemetry.

Built with **Tauri 2** (Rust core + system WebView) and **React + TypeScript + Vite**. Cross-platform
(**Linux** and **Windows 11**).

> **Status: Phase 0 complete** — the full designed interface is ported to React/TypeScript and runs
> through a typed IPC data layer on fixture data. See **[PLAN.md](./PLAN.md)** for the roadmap and
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

## What works now (Phase 0)

- The complete interface — Projects catalog (grid/list), Description (identity, summary, directory
  cross-section, file preview), Services (live table + log drawer), Settings — rendered through the
  IPC data layer on the seven sample projects and nine sample services.
- Both themes (Lithic Light / Basalt Dark) with the Settings appearance controls driving live state,
  persisted via the config layer; density and rail-emblem toggles; `Ctrl/⌘+K` search and `Ctrl+1..4`
  tab switching; frameless window with custom title-bar controls.

The catalog, services, git, summaries, and process supervision are still fixture-backed; Phases 1–5
replace each with the real Rust core. See [PLAN.md §7](./PLAN.md).
