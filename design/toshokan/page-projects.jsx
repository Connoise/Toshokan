// Toshokan — Projects catalog page
/* global React, Icon, Node, Slot, SpecimenFrame, TechChip, PathChip, PrimaryBtn, SecondaryBtn, IconBtn */

const { useState, useMemo } = React;
const usePCState = useState;
const usePCMemo = useMemo;

// ---- Specimen tile ----------------------------------------------------------
function ProjectTile({ project, selected, runningState, onSelect, onOpen, onLaunch }) {
  const [hover, setHover] = useState(false);
  const isRunning = runningState === "running" || runningState === "starting";
  const isFailed = runningState === "failed";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(project.id)}
      onDoubleClick={() => onOpen(project.id)}
      onKeyDown={(e) => { if (e.key === "Enter") onOpen(project.id); }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        background: "var(--surface)",
        border: selected ? "1.5px solid var(--signal)" : "1px solid var(--line-soft)",
        borderRadius: "var(--r-tile)",
        // asymmetric clipped corner (specimen cut)
        borderTopRightRadius: 4,
        padding: "18px 18px 0",
        boxShadow: hover || selected ? "var(--shadow-raised)" : "var(--shadow-tile)",
        transform: hover ? "translateY(-2px)" : "none",
        transition: "box-shadow 150ms ease, transform 150ms ease, border-color 150ms ease",
        cursor: "pointer",
        display: "flex", flexDirection: "column",
        outline: selected ? "1px solid var(--signal-soft)" : "none",
        outlineOffset: 3
      }}
    >
      {/* corner state node */}
      <span style={{ position: "absolute", top: 10, right: 10 }}>
        {isRunning && <Node state={runningState} size={8} pulse={runningState === "starting"} />}
        {isFailed && <Node state="failed" size={8} />}
        {selected && !isRunning && !isFailed && <Node state="signal" size={8} />}
      </span>

      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <SpecimenFrame size={84} label={`icon: ${project.name}`} selected={selected} />
        <div style={{ minWidth: 0, paddingTop: 4 }}>
          <div style={{ fontSize: 16.5, fontWeight: 700, letterSpacing: "-0.01em" }}>{project.name}</div>
          <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 3, textWrap: "pretty" }}>{project.desc}</div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14 }}>
        {project.tech.map((t) => <TechChip key={t} label={t} />)}
      </div>

      <div style={{ marginTop: 10, display: "flex" }}>
        <PathChip path={project.path} />
      </div>

      {project.service && (
        <div style={{
          marginTop: 10, display: "flex", alignItems: "center", gap: 8,
          padding: "6px 9px", background: "var(--running-soft)",
          border: "1px solid var(--line-soft)", borderRadius: "var(--r-chip)"
        }}>
          <Node state="running" size={6} pulse />
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{project.service.label}</span>
          <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto" }}>{project.service.url}</span>
        </div>
      )}

      {project.subprojects.length > 0 && (
        <div style={{
          marginTop: 12,
          background: "var(--surface-recessed)",
          border: "1px solid var(--line-soft)",
          borderRadius: 9, padding: "8px 10px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
            <span className="micro">Subprojects</span>
            <span className="mono" style={{ fontSize: 10, background: "var(--surface)", border: "1px solid var(--line-soft)", borderRadius: 4, padding: "0 5px" }}>{project.subprojects.length}</span>
          </div>
          {project.subprojects.map((sp) => (
            <div key={sp.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{sp.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{sp.desc}</div>
              </div>
              <IconBtn icon="play" title={`Launch ${sp.name}`} size={26} onClick={(e) => { e.stopPropagation(); onLaunch(sp.name); }} />
            </div>
          ))}
        </div>
      )}

      {/* tile footer — separated by a faint stratum line */}
      <div style={{
        marginTop: "auto", display: "flex", alignItems: "center", gap: 8,
        borderTop: "1px solid var(--line-soft)",
        margin: "14px -18px 0", padding: "10px 14px 10px 18px",
        background: "linear-gradient(180deg, transparent, rgba(135,148,154,0.05))",
        borderBottomLeftRadius: "var(--r-tile)", borderBottomRightRadius: "var(--r-tile)"
      }}>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{project.lastOpened}</span>
        <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <IconBtn icon="play" title={`Launch ${project.name}`} size={28} onClick={(e) => { e.stopPropagation(); onLaunch(project.name); }} />
          <IconBtn icon="dots" title="More actions" size={28} onClick={(e) => e.stopPropagation()} />
        </span>
      </div>
    </div>
  );
}

// ---- Recent band ------------------------------------------------------------
function RecentBand({ project, badge, services, onLaunch, onOpen }) {
  const svcs = services.filter((s) => s.projectId === project.id);
  const active = svcs.filter((s) => s.status === "running" || s.status === "starting");
  return (
    <section aria-label="Selected project" style={{
      position: "relative",
      background: "var(--surface)",
      border: "1px solid var(--line-soft)",
      borderRadius: "var(--r-panel)",
      boxShadow: "var(--shadow-tile)",
      padding: "20px 24px",
      display: "grid",
      gridTemplateColumns: "minmax(260px, 1fr) minmax(180px, 320px) auto auto",
      gap: 24, alignItems: "center",
      overflow: "hidden"
    }}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <span className="micro" style={{
          display: "inline-block", padding: "2px 8px", borderRadius: 5,
          border: "1px solid var(--line-soft)", background: "var(--bg-base)", marginBottom: 10
        }}>{badge}</span>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: "-0.015em" }}>{project.name}</h2>
        <div style={{ color: "var(--text-secondary)", marginTop: 4, fontSize: 13.5 }}>{project.desc}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 12, alignItems: "center" }}>
          {project.tech.map((t) => <TechChip key={t} label={t} />)}
          <PathChip path={project.path} />
        </div>
      </div>

      {/* selected project's live services — what's running before you launch */}
      <div style={{
        alignSelf: "stretch", display: "flex", flexDirection: "column", gap: 6, justifyContent: "center",
        borderLeft: "1px solid var(--line-soft)", paddingLeft: 20, minWidth: 0
      }}>
        <div className="micro" style={{ marginBottom: 2 }}>
          {active.length > 0 ? `${active.length} service${active.length > 1 ? "s" : ""} active` : "Services"}
        </div>
        {svcs.length === 0 && (
          <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>No services configured</span>
        )}
        {svcs.slice(0, 3).map((s) => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <Node state={s.status} size={7} pulse={s.status === "starting"} />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.role}</span>
            {s.port && <span className="mono" style={{ fontSize: 10.5, color: "var(--text-muted)", marginLeft: "auto", flexShrink: 0 }}>{s.port}</span>}
          </div>
        ))}
        {svcs.length > 3 && (
          <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>+{svcs.length - 3} more</span>
        )}
      </div>

      <div style={{ textAlign: "right" }}>
        <div className="micro" style={{ marginBottom: 3 }}>Last opened</div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{project.lastOpened}</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 9, minWidth: 150 }}>
        <PrimaryBtn icon="play" big onClick={() => onLaunch(project.name)}>Launch</PrimaryBtn>
        <SecondaryBtn icon="folder" onClick={() => onOpen(project.id)} style={{ justifyContent: "center" }}>Open Folder</SecondaryBtn>
      </div>
    </section>
  );
}

// ---- Compact list row ---------------------------------------------------------
function ProjectRow({ project, selected, runningState, onSelect, onOpen, onLaunch }) {
  const [hover, setHover] = useState(false);
  return (
    <div role="button" tabIndex={0}
      onClick={() => onSelect(project.id)}
      onDoubleClick={() => onOpen(project.id)}
      onKeyDown={(e) => { if (e.key === "Enter") onOpen(project.id); }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: "grid",
        gridTemplateColumns: "44px minmax(140px, 1.1fr) 1.4fr minmax(180px, 1.2fr) 130px 80px",
        gap: 14, alignItems: "center",
        padding: "9px 16px",
        background: selected ? "var(--signal-soft)" : hover ? "var(--surface)" : "transparent",
        borderBottom: "1px solid var(--line-soft)",
        borderLeft: selected ? "2.5px solid var(--signal)" : "2.5px solid transparent",
        cursor: "pointer"
      }}>
      <SpecimenFrame size={44} label={`icon: ${project.name}`} selected={selected} />
      <div style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
        {project.name}
        {(runningState === "running" || runningState === "starting") && <Node state={runningState} size={6} pulse={runningState === "starting"} />}
        {runningState === "failed" && <Node state="failed" size={6} />}
      </div>
      <div style={{ fontSize: 12.5, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{project.desc}</div>
      <PathChip path={project.path} />
      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{project.lastOpened}</span>
      <span style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
        <IconBtn icon="play" title={`Launch ${project.name}`} size={26} onClick={(e) => { e.stopPropagation(); onLaunch(project.name); }} />
        <IconBtn icon="dots" title="More actions" size={26} onClick={(e) => e.stopPropagation()} />
      </span>
    </div>
  );
}

// ---- Page -----------------------------------------------------------------------
function ProjectsPage({ projects, services, selectedId, onSelect, onOpen, onLaunch, query }) {
  const [sort, setSort] = usePCState("lastOpened");
  const [view, setView] = usePCState("grid");

  const stateFor = (pid) => {
    const svcs = services.filter((s) => s.projectId === pid);
    if (svcs.some((s) => s.status === "failed")) return "failed";
    if (svcs.some((s) => s.status === "starting")) return "starting";
    if (svcs.some((s) => s.status === "running")) return "running";
    return null;
  };

  const filtered = usePCMemo(() => {
    let list = projects;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q) ||
        p.path.toLowerCase().includes(q) || p.tech.some((t) => t.toLowerCase().includes(q)));
    }
    return [...list].sort((a, b) => sort === "name" ? a.name.localeCompare(b.name) : a.sortKey - b.sortKey);
  }, [projects, query, sort]);

  // the launch band follows the current selection (falls back to the most recent)
  const recentMost = projects.find((p) => p.id === "idolmancer");
  const featured = projects.find((p) => p.id === selectedId) || recentMost;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {!query.trim() && <RecentBand project={featured} badge={featured === recentMost ? "Recent" : "Selected"} services={services} onLaunch={onLaunch} onOpen={onOpen} />}

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700, color: "var(--text-secondary)" }}>
          {query.trim() ? "Results" : "All Projects"}
        </h3>
        <span className="mono" style={{ fontSize: 11, background: "var(--surface)", border: "1px solid var(--line-soft)", borderRadius: 5, padding: "1px 7px", color: "var(--text-secondary)" }}>{filtered.length}</span>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: 12.5, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
            Sort:
            <select value={sort} onChange={(e) => setSort(e.target.value)} style={{
              fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--text-primary)",
              background: "var(--surface)", border: "1px solid var(--line-soft)", borderRadius: 7, padding: "4px 6px"
            }}>
              <option value="lastOpened">Last opened</option>
              <option value="name">Name</option>
            </select>
          </label>
          <span style={{ display: "flex", gap: 4 }}>
            <IconBtn icon="grid" title="Grid view" active={view === "grid"} onClick={() => setView("grid")} />
            <IconBtn icon="rows" title="List view" active={view === "list"} onClick={() => setView("list")} />
          </span>
        </span>
      </div>

      {filtered.length === 0 && (
        <div style={{ padding: "60px 0", textAlign: "center", color: "var(--text-muted)" }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--text-secondary)" }}>No projects match \u201C{query}\u201D</div>
          <div style={{ fontSize: 12.5, marginTop: 5 }}>Try a different name, path, or technology.</div>
        </div>
      )}

      {view === "grid" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(248px, 1fr))", gap: 18, alignItems: "stretch", paddingBottom: 8 }}>
          {filtered.map((p) => (
            <ProjectTile key={p.id} project={p} selected={selectedId === p.id} runningState={stateFor(p.id)}
              onSelect={onSelect} onOpen={onOpen} onLaunch={onLaunch} />
          ))}
        </div>
      ) : (
        <div style={{ background: "var(--surface)", border: "1px solid var(--line-soft)", borderRadius: "var(--r-panel)", boxShadow: "var(--shadow-tile)", overflow: "hidden", marginBottom: 8 }}>
          {filtered.map((p) => (
            <ProjectRow key={p.id} project={p} selected={selectedId === p.id} runningState={stateFor(p.id)}
              onSelect={onSelect} onOpen={onOpen} onLaunch={onLaunch} />
          ))}
        </div>
      )}
    </div>
  );
}

window.ProjectsPage = ProjectsPage;
