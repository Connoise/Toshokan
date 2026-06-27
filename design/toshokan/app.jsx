// Toshokan — application shell
/* global React, ReactDOM, Icon, Node, Slot, SpecimenFrame, BrandMark, StatusChip, IconBtn, Toast,
   ProjectsPage, ProjectPage, ServicesPage, SettingsPage,
   useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakToggle,
   TSK_PROJECTS, TSK_SERVICES */

const { useState, useEffect, useRef } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "Lithic Light",
  "substrate": true,
  "density": "regular"
}/*EDITMODE-END*/;

// ---- Windows 11 title bar -------------------------------------------------------
function CaptionBtn({ kind }) {
  const [hover, setHover] = useState(false);
  const isClose = kind === "close";
  return (
    <button title={kind[0].toUpperCase() + kind.slice(1)} aria-label={kind}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        width: 46, height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
        background: hover ? (isClose ? "#C42B1C" : "var(--surface-recessed)") : "transparent",
        color: hover && isClose ? "#FFFFFF" : "var(--text-secondary)",
        transition: "background 100ms ease"
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
    <div style={{
      height: 36, display: "flex", alignItems: "stretch",
      background: "var(--bg-substrate)", borderBottom: "1px solid var(--line-soft)",
      flexShrink: 0, userSelect: "none"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "0 12px" }}>
        <BrandMark size={18} />
        <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>Toshokan</span>
      </div>
      <div style={{ flex: 1 }}></div>
      <div style={{ display: "flex", alignItems: "stretch" }}>
        <CaptionBtn kind="minimize" />
        <CaptionBtn kind="maximize" />
        <CaptionBtn kind="close" />
      </div>
    </div>
  );
}

// ---- Navigation rail --------------------------------------------------------------
function RailTab({ id, label, icon, active, badge, disabled, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      aria-current={active ? "page" : undefined}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        width: "100%", padding: "12px 16px",
        borderRadius: "12px 0 0 12px",
        background: active ? "var(--surface)" : hover ? "var(--surface-recessed)" : "transparent",
        borderTop: active ? "1px solid var(--line-soft)" : "1px solid transparent",
        borderBottom: active ? "1px solid var(--line-soft)" : "1px solid transparent",
        borderLeft: active ? "1px solid var(--line-soft)" : "1px solid transparent",
        borderRight: "none",
        boxShadow: active ? "var(--shadow-tile)" : "none",
        position: "relative",
        color: active ? "var(--text-primary)" : "var(--text-secondary)",
        fontSize: 14.5, fontWeight: active ? 700 : 500,
        transition: "background 130ms ease",
        textAlign: "left",
        opacity: disabled ? 0.55 : 1
      }}>
      {/* illuminated seam marker for selection */}
      {active && <span aria-hidden="true" style={{
        position: "absolute", left: 0, top: 9, bottom: 9, width: 3,
        borderRadius: 2, background: "var(--signal)",
        boxShadow: "0 0 6px var(--signal-soft)"
      }}></span>}
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

function NavRail({ tab, setTab, hasSelection, showSubstrate }) {
  return (
    <nav aria-label="Primary" style={{
      width: 196, flexShrink: 0, display: "flex", flexDirection: "column",
      background: "var(--bg-substrate)", borderRight: "1px solid var(--line-soft)",
      paddingTop: 18, position: "relative", overflow: "hidden"
    }}>
      <div style={{ paddingLeft: 10, display: "flex", flexDirection: "column", gap: 5, position: "relative", zIndex: 1 }}>
        <RailTab id="projects" label="Projects" icon="grid" active={tab === "projects"} onClick={() => setTab("projects")} />
        <RailTab id="project" label="Description" icon="book" active={tab === "project"} badge={hasSelection ? 1 : 0} onClick={() => setTab("project")} />
        <RailTab id="services" label="Services" icon="pulse" active={tab === "services"} onClick={() => setTab("services")} />
        <RailTab id="settings" label="Settings" icon="gear" active={tab === "settings"} onClick={() => setTab("settings")} />
      </div>

      {/* rail base: unified shield emblem (replaces separate substrate + brand mark) */}
      <div style={{ marginTop: "auto", padding: "0 14px 18px", display: "flex", justifyContent: "center" }}>
        {showSubstrate && (
          <span aria-hidden="true" style={{ display: "flex", justifyContent: "center" }}>
            <img className="tsk-icon-light" src="toshokan/assets/rail-emblem.png" alt="" style={{ width: "auto", height: 240, objectFit: "contain", verticalAlign: "top", mixBlendMode: "multiply", opacity: 0.95 }} />
            <img className="tsk-icon-dark" src="toshokan/assets/rail-emblem-dark.png" alt="" style={{ width: "auto", height: 240, objectFit: "contain", verticalAlign: "top", mixBlendMode: "screen", opacity: 0.95 }} />
          </span>
        )}
      </div>
    </nav>
  );
}

// ---- Context header --------------------------------------------------------------
const TSK_PAGE_SUBTITLES = { projects: "Project Catalog", project: "Description", services: "Services", settings: "Settings" };

function ContextHeader({ tab, query, setQuery, activeCount, onServices, searchRef }) {
  return (
    <header style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: "16px 28px 14px", flexShrink: 0
    }}>
      <div style={{ minWidth: 150 }}>
        <h1 style={{ margin: 0, fontSize: 25, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1 }}>Toshokan</h1>
        <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 2 }}>{TSK_PAGE_SUBTITLES[tab]}</div>
      </div>

      <select aria-label="Workspace root" defaultValue="~/Workspace" style={{
        fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-primary)",
        background: "var(--surface)", border: "1px solid var(--line-soft)",
        borderRadius: 9, padding: "8px 10px", boxShadow: "var(--shadow-chip)"
      }}>
        <option>~/Workspace</option>
        <option>~/Experiments</option>
        <option>~/Archive</option>
      </select>

      <div style={{ flex: 1, maxWidth: 420, marginLeft: "auto", display: "flex", alignItems: "center", gap: 9, background: "var(--surface)", border: "1px solid var(--line-soft)", borderRadius: 10, padding: "8px 12px", boxShadow: "var(--shadow-chip)" }}>
        <Icon name="search" size={15} style={{ color: "var(--text-muted)" }} />
        <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder={tab === "services" ? "Search services or filter..." : "Search projects or run command..."}
          style={{ border: "none", background: "transparent", fontSize: 13, flex: 1, minWidth: 0 }} />
        <span className="mono" style={{ fontSize: 10.5, color: "var(--text-muted)", border: "1px solid var(--line-soft)", borderRadius: 4, padding: "1px 5px", whiteSpace: "nowrap" }}>Ctrl K</span>
      </div>

      <StatusChip label="Local" state="running" />

      <button onClick={onServices} style={{
        display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
        background: "var(--surface)", border: "1px solid var(--line-soft)", borderRadius: 9,
        fontSize: 12.5, fontWeight: 600, color: "var(--text-secondary)", boxShadow: "var(--shadow-chip)"
      }}>
        <Icon name="pulse" size={14} />
        {activeCount} Service{activeCount === 1 ? "" : "s"} Active
      </button>

      <IconBtn icon="sliders" title="Settings" size={36} />
    </header>
  );
}

// ---- Status strip --------------------------------------------------------------
function StripItem({ icon, label, value, state }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      <Icon name={icon} size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{label}</span>
      <span className={typeof value === "string" && value.startsWith("~") ? "mono" : ""} style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", fontFamily: typeof value === "string" && (value.startsWith("~") || value.includes(":")) ? "var(--font-mono)" : "inherit" }}>{value}</span>
      {state && <Node state={state} size={5} />}
    </span>
  );
}

function StatusStrip({ activeCount }) {
  return (
    <footer style={{
      display: "flex", alignItems: "center", gap: 26,
      padding: "10px 28px", borderTop: "1px solid var(--line-soft)",
      background: "var(--bg-substrate)", flexShrink: 0, overflow: "hidden"
    }}>
      <StripItem icon="folder" label="Workspace Root" value="~/Workspace" />
      <StripItem icon="pulse" label="Active Services" value={String(activeCount)} />
      <StripItem icon="refresh" label="Last Refresh" value="Today, 10:45 AM" state="running" />
      <StripItem icon="layers" label="Local Status" value="All data is local" state="running" />
      <span aria-hidden="true" style={{ marginLeft: "auto", minWidth: 0, flexShrink: 1, display: "flex", justifyContent: "flex-end", overflow: "hidden" }}>
        <img className="tsk-icon-light" src="toshokan/assets/substrate-corner.png" alt="" style={{ height: 18, mixBlendMode: "multiply", opacity: 0.85 }} />
        <img className="tsk-icon-dark" src="toshokan/assets/substrate-corner-dark.png" alt="" style={{ height: 18, mixBlendMode: "screen", opacity: 0.85 }} />
      </span>
    </footer>
  );
}

// ---- App ------------------------------------------------------------------------
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [tab, setTab] = useState("projects");
  const [selectedId, setSelectedId] = useState("idolmancer");
  const [services, setServices] = useState(TSK_SERVICES);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const searchRef = useRef(null);

  // theme attribute — transitions are suppressed during the flip so every
  // surface snaps to its new palette atomically (a frozen mid-flip transition
  // can leave e.g. the active rail tab light-on-dark).
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("tsk-theme-switching");
    root.setAttribute("data-theme", t.theme === "Basalt Dark" ? "dark" : "light");
    const id = setTimeout(() => root.classList.remove("tsk-theme-switching"), 80);
    return () => clearTimeout(id);
  }, [t.theme]);

  // Ctrl+K focuses search; 1/2/3 with Ctrl switches tabs
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current && searchRef.current.focus();
      }
      if ((e.ctrlKey || e.metaKey) && ["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        setTab(["projects", "project", "services", "settings"][Number(e.key) - 1]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // the 'starting' Megane service settles into running after a while
  useEffect(() => {
    const id = setTimeout(() => {
      setServices((prev) => prev.map((s) => s.id === "svc-megane" && s.status === "starting"
        ? { ...s, status: "running", pid: "21073", uptime: "1m" } : s));
    }, 9000);
    return () => clearTimeout(id);
  }, []);

  const showToast = (msg) => {
    clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  };

  const setStatus = (id, status, extra = {}) =>
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, status, error: status === "failed" ? s.error : undefined, ...extra } : s)));

  const startService = (id) => {
    setStatus(id, "starting", { pid: null, uptime: null, ram: null });
    showToast("Starting service...");
    setTimeout(() => setStatus(id, "running", { pid: String(12000 + Math.floor(Math.random() * 9000)), uptime: "0m", ram: 80 + Math.floor(Math.random() * 220) }), 2600);
  };
  const stopService = (id) => { setStatus(id, "stopped", { pid: null, uptime: null, ram: null }); showToast("Service stopped."); };
  const restartService = (id) => {
    setStatus(id, "starting", { uptime: null, ram: null });
    showToast("Restarting service...");
    setTimeout(() => setStatus(id, "running", { uptime: "0m", ram: 80 + Math.floor(Math.random() * 220) }), 2600);
  };

  const launch = (name) => showToast(`Launch \u201C${name}\u201D \u2014 command wiring pending backend`);
  const action = (label) => showToast(`${label} \u2014 wiring pending backend`);

  const openProject = (id) => { setSelectedId(id); setTab("project"); setQuery(""); };
  const goTab = (next) => { setTab(next); setQuery(""); };

  const activeCount = services.filter((s) => s.status === "running" || s.status === "starting").length;
  const selectedProject = TSK_PROJECTS.find((p) => p.id === selectedId) || null;
  const dense = t.density === "compact";

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg-base)", fontSize: dense ? 13 : 14 }}>
      <TitleBar />
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <NavRail tab={tab} setTab={goTab} hasSelection={!!selectedProject} showSubstrate={t.substrate} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <ContextHeader tab={tab} query={query} setQuery={setQuery} activeCount={activeCount} onServices={() => goTab("services")} searchRef={searchRef} />
          <main data-screen-label={"Tab: " + tab} style={{ flex: 1, overflowY: "auto", padding: dense ? "4px 28px 18px" : "6px 28px 22px", minHeight: 0 }}>
            {tab === "projects" && (
              <ProjectsPage projects={TSK_PROJECTS} services={services} selectedId={selectedId} query={query}
                onSelect={setSelectedId} onOpen={openProject} onLaunch={launch} />
            )}
            {tab === "project" && (
              <ProjectPage project={selectedProject} projects={TSK_PROJECTS} services={services}
                onSelect={setSelectedId} onLaunch={launch} onAction={action} onBrowse={() => goTab("projects")} />
            )}
            {tab === "services" && (
              <ServicesPage services={services} query={query}
                onStart={startService} onStop={stopService} onRestart={restartService}
                onAction={action} onBrowse={() => goTab("projects")} />
            )}
            {tab === "settings" && (
              <SettingsPage t={t} setTweak={setTweak} />
            )}
          </main>
          <StatusStrip activeCount={activeCount} />
        </div>
      </div>

      <Toast message={toast} />

      <TweaksPanel>
        <TweakSection label="Theme" />
        <TweakRadio label="Palette" value={t.theme} options={["Lithic Light", "Basalt Dark"]} onChange={(v) => setTweak("theme", v)} />
        <TweakSection label="Substrate" />
        <TweakToggle label="Show asset slots in rail" value={t.substrate} onChange={(v) => setTweak("substrate", v)} />
        <TweakSection label="Layout" />
        <TweakRadio label="Density" value={t.density} options={["regular", "compact"]} onChange={(v) => setTweak("density", v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
