// Toshokan — application shell.
import { useState, useEffect, useRef, useCallback } from "react";
import { Icon, Node, BrandMark, StatusChip, IconBtn, Toast } from "./components/shared";
import { ProjectsPage } from "./pages/ProjectsPage";
import { ProjectPage } from "./pages/ProjectPage";
import { ServicesPage } from "./pages/ServicesPage";
import { SettingsPage } from "./pages/SettingsPage";
import {
  listProjects, listServices, getConfig, patchConfig, DEFAULT_CONFIG, isTauri,
  type Project, type Service, type Appearance,
} from "./ipc";

type Tab = "projects" | "project" | "services" | "settings";

// ---- Windows 11 title bar ---------------------------------------------------
// The window is frameless (decorations:false); these controls drive the real
// Tauri window. No-ops in a plain browser (Vite dev / fixtures preview).
async function windowControl(kind: "minimize" | "maximize" | "close") {
  if (!isTauri) return;
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const w = getCurrentWindow();
  if (kind === "minimize") await w.minimize();
  else if (kind === "maximize") await w.toggleMaximize();
  else await w.close();
}

function CaptionBtn({ kind }: { kind: "minimize" | "maximize" | "close" }) {
  const [hover, setHover] = useState(false);
  const isClose = kind === "close";
  return (
    <button title={kind[0].toUpperCase() + kind.slice(1)} aria-label={kind}
      onClick={() => windowControl(kind)}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        width: 46, height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
        background: hover ? (isClose ? "#C42B1C" : "var(--surface-recessed)") : "transparent",
        color: hover && isClose ? "#FFFFFF" : "var(--text-secondary)", transition: "background 100ms ease",
      }}>
      <svg width="11" height="11" viewBox="0 0 11 11" stroke="currentColor" strokeWidth="1.1" fill="none" aria-hidden="true">
        {kind === "minimize" && <line x1="0.5" y1="5.5" x2="10.5" y2="5.5" />}
        {kind === "maximize" && <rect x="1" y="1" width="9" height="9" rx="1.5" />}
        {kind === "close" && <g><line x1="1" y1="1" x2="10" y2="10" /><line x1="10" y1="1" x2="1" y2="10" /></g>}
      </svg>
    </button>
  );
}

function TitleBar() {
  return (
    <div data-tauri-drag-region style={{ height: 36, display: "flex", alignItems: "stretch", background: "var(--bg-substrate)", borderBottom: "1px solid var(--line-soft)", flexShrink: 0, userSelect: "none" }}>
      <div data-tauri-drag-region style={{ display: "flex", alignItems: "center", gap: 9, padding: "0 12px" }}>
        <BrandMark size={18} />
        <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>Toshokan</span>
      </div>
      <div data-tauri-drag-region style={{ flex: 1 }}></div>
      <div style={{ display: "flex", alignItems: "stretch" }}>
        <CaptionBtn kind="minimize" />
        <CaptionBtn kind="maximize" />
        <CaptionBtn kind="close" />
      </div>
    </div>
  );
}

// ---- Navigation rail --------------------------------------------------------
function RailTab({ label, icon, active, badge, disabled, onClick }: { label: string; icon: string; active: boolean; badge?: number; disabled?: boolean; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} aria-current={active ? "page" : undefined}
      style={{
        display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "12px 16px", borderRadius: "12px 0 0 12px",
        background: active ? "var(--surface)" : hover ? "var(--surface-recessed)" : "transparent",
        borderTop: active ? "1px solid var(--line-soft)" : "1px solid transparent",
        borderBottom: active ? "1px solid var(--line-soft)" : "1px solid transparent",
        borderLeft: active ? "1px solid var(--line-soft)" : "1px solid transparent", borderRight: "none",
        boxShadow: active ? "var(--shadow-tile)" : "none", position: "relative",
        color: active ? "var(--text-primary)" : "var(--text-secondary)",
        fontSize: 14.5, fontWeight: active ? 700 : 500, transition: "background 130ms ease", textAlign: "left",
        opacity: disabled ? 0.55 : 1,
      }}>
      {active && <span aria-hidden="true" style={{ position: "absolute", left: 0, top: 9, bottom: 9, width: 3, borderRadius: 2, background: "var(--signal)", boxShadow: "0 0 6px var(--signal-soft)" }}></span>}
      <Icon name={icon} size={19} stroke={1.6} />
      {label}
      {badge != null && badge > 0 && (
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
          <Node state="signal" size={6} />
        </span>
      )}
    </button>
  );
}

function NavRail({ tab, setTab, hasSelection, showSubstrate }: { tab: Tab; setTab: (t: Tab) => void; hasSelection: boolean; showSubstrate: boolean }) {
  return (
    <nav aria-label="Primary" style={{ width: 196, flexShrink: 0, display: "flex", flexDirection: "column", background: "var(--bg-substrate)", borderRight: "1px solid var(--line-soft)", paddingTop: 18, position: "relative", overflow: "hidden" }}>
      <div style={{ paddingLeft: 10, display: "flex", flexDirection: "column", gap: 5, position: "relative", zIndex: 1 }}>
        <RailTab label="Projects" icon="grid" active={tab === "projects"} onClick={() => setTab("projects")} />
        <RailTab label="Description" icon="book" active={tab === "project"} badge={hasSelection ? 1 : 0} onClick={() => setTab("project")} />
        <RailTab label="Services" icon="pulse" active={tab === "services"} onClick={() => setTab("services")} />
        <RailTab label="Settings" icon="gear" active={tab === "settings"} onClick={() => setTab("settings")} />
      </div>

      <div style={{ marginTop: "auto", padding: "0 14px 18px", display: "flex", justifyContent: "center" }}>
        {showSubstrate && (
          <span aria-hidden="true" style={{ display: "flex", justifyContent: "center" }}>
            <img className="tsk-icon-light" src="/assets/rail-emblem.png" alt="" style={{ width: "auto", height: 240, objectFit: "contain", verticalAlign: "top", mixBlendMode: "multiply", opacity: 0.95 }} />
            <img className="tsk-icon-dark" src="/assets/rail-emblem-dark.png" alt="" style={{ width: "auto", height: 240, objectFit: "contain", verticalAlign: "top", mixBlendMode: "screen", opacity: 0.95 }} />
          </span>
        )}
      </div>
    </nav>
  );
}

// ---- Context header ---------------------------------------------------------
const PAGE_SUBTITLES: Record<Tab, string> = { projects: "Project Catalog", project: "Description", services: "Services", settings: "Settings" };

function ContextHeader({ tab, query, setQuery, activeCount, onServices, searchRef }: { tab: Tab; query: string; setQuery: (q: string) => void; activeCount: number; onServices: () => void; searchRef: React.RefObject<HTMLInputElement> }) {
  return (
    <header style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 28px 14px", flexShrink: 0 }}>
      <div style={{ minWidth: 150 }}>
        <h1 style={{ margin: 0, fontSize: 25, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1 }}>Toshokan</h1>
        <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 2 }}>{PAGE_SUBTITLES[tab]}</div>
      </div>

      <select aria-label="Workspace root" defaultValue="~/Projects" style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-primary)", background: "var(--surface)", border: "1px solid var(--line-soft)", borderRadius: 9, padding: "8px 10px", boxShadow: "var(--shadow-chip)" }}>
        <option>~/Projects</option>
      </select>

      <div style={{ flex: 1, maxWidth: 420, marginLeft: "auto", display: "flex", alignItems: "center", gap: 9, background: "var(--surface)", border: "1px solid var(--line-soft)", borderRadius: 10, padding: "8px 12px", boxShadow: "var(--shadow-chip)" }}>
        <Icon name="search" size={15} style={{ color: "var(--text-muted)" }} />
        <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder={tab === "services" ? "Search services or filter..." : "Search projects or run command..."}
          style={{ border: "none", background: "transparent", fontSize: 13, flex: 1, minWidth: 0 }} />
        <span className="mono" style={{ fontSize: 10.5, color: "var(--text-muted)", border: "1px solid var(--line-soft)", borderRadius: 4, padding: "1px 5px", whiteSpace: "nowrap" }}>Ctrl K</span>
      </div>

      <StatusChip label="Local" state="running" />

      <button onClick={onServices} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "var(--surface)", border: "1px solid var(--line-soft)", borderRadius: 9, fontSize: 12.5, fontWeight: 600, color: "var(--text-secondary)", boxShadow: "var(--shadow-chip)" }}>
        <Icon name="pulse" size={14} />
        {activeCount} Service{activeCount === 1 ? "" : "s"} Active
      </button>

      <IconBtn icon="sliders" title="Settings" size={36} />
    </header>
  );
}

// ---- Status strip -----------------------------------------------------------
function StripItem({ icon, label, value, state }: { icon: string; label: string; value: string; state?: "running" }) {
  const isMonoish = value.startsWith("~") || value.includes(":");
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      <Icon name={icon} size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{label}</span>
      <span className={value.startsWith("~") ? "mono" : ""} style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", fontFamily: isMonoish ? "var(--font-mono)" : "inherit" }}>{value}</span>
      {state && <Node state={state} size={5} />}
    </span>
  );
}

function StatusStrip({ activeCount }: { activeCount: number }) {
  return (
    <footer style={{ display: "flex", alignItems: "center", gap: 26, padding: "10px 28px", borderTop: "1px solid var(--line-soft)", background: "var(--bg-substrate)", flexShrink: 0, overflow: "hidden" }}>
      <StripItem icon="folder" label="Workspace Root" value="~/Projects" />
      <StripItem icon="pulse" label="Active Services" value={String(activeCount)} />
      <StripItem icon="refresh" label="Last Refresh" value="Today, 10:45 AM" state="running" />
      <StripItem icon="layers" label="Local Status" value="All data is local" state="running" />
      <span aria-hidden="true" style={{ marginLeft: "auto", minWidth: 0, flexShrink: 1, display: "flex", justifyContent: "flex-end", overflow: "hidden" }}>
        <img className="tsk-icon-light" src="/assets/substrate-corner.png" alt="" style={{ height: 18, mixBlendMode: "multiply", opacity: 0.85 }} />
        <img className="tsk-icon-dark" src="/assets/substrate-corner-dark.png" alt="" style={{ height: 18, mixBlendMode: "screen", opacity: 0.85 }} />
      </span>
    </footer>
  );
}

// ---- App --------------------------------------------------------------------
export default function App() {
  const [appearance, setAppearance] = useState<Appearance>(DEFAULT_CONFIG.appearance);
  const [tab, setTab] = useState<Tab>("projects");
  const [selectedId, setSelectedId] = useState("idolmancer");
  const [projects, setProjects] = useState<Project[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // initial data + persisted appearance
  useEffect(() => {
    listProjects().then(setProjects);
    listServices().then(setServices);
    getConfig().then((c) => setAppearance(c.appearance));
  }, []);

  // theme attribute — transitions suppressed during the flip so surfaces snap atomically
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("tsk-theme-switching");
    root.setAttribute("data-theme", appearance.theme === "Basalt Dark" ? "dark" : "light");
    const id = setTimeout(() => root.classList.remove("tsk-theme-switching"), 80);
    return () => clearTimeout(id);
  }, [appearance.theme]);

  const updateAppearance = useCallback(<K extends keyof Appearance>(key: K, value: Appearance[K]) => {
    setAppearance((prev) => {
      const next = { ...prev, [key]: value };
      patchConfig({ appearance: next });
      return next;
    });
  }, []);

  // Ctrl+K focuses search; Ctrl+1..4 switches tabs
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if ((e.ctrlKey || e.metaKey) && ["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        setTab((["projects", "project", "services", "settings"] as Tab[])[Number(e.key) - 1]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // the 'starting' Megane service settles into running after a while (fixture demo)
  useEffect(() => {
    const id = setTimeout(() => {
      setServices((prev) => prev.map((s) => (s.id === "svc-megane" && s.status === "starting" ? { ...s, status: "running", pid: "21073", uptime: "1m" } : s)));
    }, 9000);
    return () => clearTimeout(id);
  }, [services.length]);

  const showToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  };

  const setStatus = (id: string, status: Service["status"], extra: Partial<Service> = {}) =>
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, status, error: status === "failed" ? s.error : undefined, ...extra } : s)));

  const startService = (id: string) => {
    setStatus(id, "starting", { pid: null, uptime: null, ram: null });
    showToast("Starting service...");
    setTimeout(() => setStatus(id, "running", { pid: String(12000 + Math.floor(Math.random() * 9000)), uptime: "0m", ram: 80 + Math.floor(Math.random() * 220) }), 2600);
  };
  const stopService = (id: string) => { setStatus(id, "stopped", { pid: null, uptime: null, ram: null }); showToast("Service stopped."); };
  const restartService = (id: string) => {
    setStatus(id, "starting", { uptime: null, ram: null });
    showToast("Restarting service...");
    setTimeout(() => setStatus(id, "running", { uptime: "0m", ram: 80 + Math.floor(Math.random() * 220) }), 2600);
  };

  const launch = (name: string) => showToast(`Launch “${name}” — command wiring pending backend`);
  const action = (label: string) => showToast(`${label} — wiring pending backend`);

  const openProject = (id: string) => { setSelectedId(id); setTab("project"); setQuery(""); };
  const goTab = (next: Tab) => { setTab(next); setQuery(""); };

  const activeCount = services.filter((s) => s.status === "running" || s.status === "starting").length;
  const selectedProject = projects.find((p) => p.id === selectedId) || null;
  const dense = appearance.density === "compact";

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg-base)", fontSize: dense ? 13 : 14 }}>
      <TitleBar />
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <NavRail tab={tab} setTab={goTab} hasSelection={!!selectedProject} showSubstrate={appearance.railEmblem} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <ContextHeader tab={tab} query={query} setQuery={setQuery} activeCount={activeCount} onServices={() => goTab("services")} searchRef={searchRef} />
          <main data-screen-label={"Tab: " + tab} style={{ flex: 1, overflowY: "auto", padding: dense ? "4px 28px 18px" : "6px 28px 22px", minHeight: 0 }}>
            {tab === "projects" && (
              <ProjectsPage projects={projects} services={services} selectedId={selectedId} query={query} onSelect={setSelectedId} onOpen={openProject} onLaunch={launch} />
            )}
            {tab === "project" && (
              <ProjectPage project={selectedProject} projects={projects} services={services} onSelect={setSelectedId} onLaunch={launch} onAction={action} onBrowse={() => goTab("projects")} />
            )}
            {tab === "services" && (
              <ServicesPage services={services} query={query} onStart={startService} onStop={stopService} onRestart={restartService} onAction={action} onBrowse={() => goTab("projects")} />
            )}
            {tab === "settings" && (
              <SettingsPage appearance={appearance} onAppearanceChange={updateAppearance} />
            )}
          </main>
          <StatusStrip activeCount={activeCount} />
        </div>
      </div>

      <Toast message={toast} />
    </div>
  );
}
