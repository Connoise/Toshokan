// Toshokan — Services page (active seams table)
/* global React, Icon, Node, Slot, SpecimenFrame, StatusChip, SecondaryBtn, IconBtn */

const { useState } = React;

const TSK_STATUS_META = {
  running:  { label: "Running",  node: "running",  pulse: true },
  starting: { label: "Starting", node: "starting", pulse: true },
  stopped:  { label: "Stopped",  node: "stopped",  pulse: false },
  failed:   { label: "Failed",   node: "failed",   pulse: false }
};

const SVC_GRID = "110px minmax(150px, 1.3fr) minmax(160px, 1.3fr) minmax(170px, 1.4fr) 150px 70px 90px 110px 150px";

function RamCell({ ram, live }) {
  if (ram == null) return <span style={{ color: "var(--text-muted)" }}>{"\u2014"}</span>;
  const CAP = 512; // scale reference for the usage bar
  const pct = Math.min(100, Math.round((ram / CAP) * 100));
  const high = ram >= 350;
  const barColor = !live ? "var(--line)" : high ? "var(--warning)" : "var(--running)";
  return (
    <span style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <span className="mono" style={{ fontSize: 12, color: live ? "var(--text-primary)" : "var(--text-muted)" }}>
        {ram} MB
      </span>
      <span aria-hidden="true" style={{ height: 3, borderRadius: 2, background: "var(--surface-recessed)", overflow: "hidden" }}>
        <span style={{ display: "block", height: "100%", width: pct + "%", background: barColor, borderRadius: 2 }}></span>
      </span>
    </span>
  );
}

function PortChip({ port, live }) {
  if (!port) return <span style={{ color: "var(--text-muted)" }}>{"\u2014"}</span>;
  return (
    <span className="mono" style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "3px 9px", background: "var(--bg-base)",
      border: "1px solid var(--line-soft)", borderRadius: 6,
      fontSize: 11.5, color: live ? "var(--text-primary)" : "var(--text-muted)"
    }}>
      <Node state={live ? "running" : "stopped"} size={5} />
      {port}
    </span>
  );
}

function LogConsole({ lines }) {
  const colors = { g: "#69C184", b: "#7CB3E8", y: "#FFB45A", r: "#D5685B", "": "#D7DDDE" };
  return (
    <div style={{
      background: "#14181B", borderRadius: 10, padding: "13px 16px",
      fontFamily: "var(--font-mono)", fontSize: 12, lineHeight: 1.85,
      overflowX: "auto", border: "1px solid rgba(0,0,0,0.4)",
      boxShadow: "inset 0 2px 8px rgba(0,0,0,0.35)", minHeight: 100
    }}>
      {lines.length === 0 && <span style={{ color: "#778288" }}>No output captured.</span>}
      {lines.map(([time, parts], i) => (
        <div key={i} style={{ whiteSpace: "pre" }}>
          <span style={{ color: "#778288" }}>{time}  </span>
          {parts.map(([text, c], j) => <span key={j} style={{ color: colors[c] }}>{text}</span>)}
        </div>
      ))}
    </div>
  );
}

function DetailField({ label, value, mono = false, chip = false, icon = null }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "128px 1fr", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>{label}</span>
      {chip ? (
        <span><StatusChip label={value} state="running" /></span>
      ) : mono ? (
        <span className="mono" style={{
          fontSize: 11.5, background: "var(--bg-base)", border: "1px solid var(--line-soft)",
          borderRadius: 6, padding: "5px 9px", color: "var(--text-primary)",
          display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "space-between",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
        }}>
          {value}
          {icon && <Icon name={icon} size={12} style={{ color: "var(--text-muted)", flexShrink: 0 }} />}
        </span>
      ) : (
        <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{value}</span>
      )}
    </div>
  );
}

function ServiceDetail({ svc }) {
  const d = svc.detail;
  return (
    <div style={{
      margin: "0 14px 14px", padding: 18,
      background: "var(--bg-base)", border: "1px solid var(--line-soft)",
      borderRadius: 12,
      display: "grid", gridTemplateColumns: "minmax(280px, 2fr) 3fr", gap: 20
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <DetailField label="Launch command" value={d.launchCommand} mono icon="copy" />
        <DetailField label="Working directory" value={d.workingDir} mono icon="folder" />
        {d.localUrl && <DetailField label="Local URL" value={d.localUrl} mono icon="external" />}
        <DetailField label="Started" value={d.started} />
        <DetailField label="User" value={d.user} />
        <DetailField label="Environment" value={d.environment} chip />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 9 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-secondary)" }}>Recent output</span>
          <Node state={svc.status === "failed" ? "failed" : svc.status === "stopped" ? "stopped" : "running"} size={6} pulse={svc.status === "running"} />
          <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <IconBtn icon="download" title="Save log" size={26} />
            <IconBtn icon="trash" title="Clear log" size={26} />
          </span>
        </div>
        <LogConsole lines={d.log} />
      </div>
    </div>
  );
}

function ServiceRow({ svc, expanded, onToggle, onStart, onStop, onRestart, onAction }) {
  const [hover, setHover] = useState(false);
  const meta = TSK_STATUS_META[svc.status];
  const live = svc.status === "running" || svc.status === "starting";

  return (
    <div style={{ borderBottom: "1px solid var(--line-soft)" }}>
      <div role="button" tabIndex={0}
        onClick={() => onToggle(svc.id)}
        onKeyDown={(e) => { if (e.key === "Enter") onToggle(svc.id); }}
        onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        style={{
          display: "grid", gridTemplateColumns: SVC_GRID, gap: 12, alignItems: "center",
          padding: "13px 16px",
          background: expanded ? "var(--surface)" : hover ? "var(--surface-recessed)" : "transparent",
          borderLeft: svc.status === "failed" ? "2.5px solid var(--error)" : live ? "2.5px solid " + (svc.status === "running" ? "var(--running)" : "var(--signal)") : "2.5px solid transparent",
          cursor: "pointer", transition: "background 130ms ease",
          position: "relative", overflow: "hidden"
        }}>
        {svc.status === "starting" && (
          <span aria-hidden="true" style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 2,
            background: "linear-gradient(90deg, transparent, var(--signal), transparent)",
            backgroundSize: "200% 100%",
            animation: "tsk-starting-sweep 1.8s linear infinite"
          }}></span>
        )}

        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Node state={meta.node} size={7} pulse={meta.pulse} />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: svc.status === "failed" ? "var(--error)" : "var(--text-secondary)" }}>{meta.label}</span>
        </span>

        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{svc.name}</span>
          <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)" }}>{svc.role}</span>
        </span>

        <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <SpecimenFrame size={40} label={`icon: ${svc.projectName}`} />
          <span style={{ minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{svc.projectName}</span>
            <span style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{svc.projectDesc}</span>
          </span>
        </span>

        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 13, fontWeight: 600 }}>{svc.runtime}</span>
          <span className="mono" style={{ display: "block", fontSize: 11, color: "var(--text-muted)", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{svc.command}</span>
        </span>

        <span><PortChip port={svc.port} live={svc.status === "running"} /></span>

        <span className="mono" style={{ fontSize: 12, color: svc.pid ? "var(--text-secondary)" : "var(--text-muted)" }}>{svc.pid || "\u2014"}</span>

        <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>
          {svc.status === "starting" ? "Starting..." : svc.status === "stopped" ? "Stopped" : svc.uptime || "\u2014"}
        </span>

        <RamCell ram={svc.ram} live={live} />

        <span style={{ display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
          {svc.status === "running" && <IconBtn icon="external" title="Open in browser" size={28} onClick={() => onAction("Open " + (svc.detail.localUrl || svc.name))} />}
          {live ? (
            <IconBtn icon="stop" title="Stop service" size={28} disabled={svc.status === "starting"} onClick={() => onStop(svc.id)} />
          ) : (
            <IconBtn icon="play" title="Start service" size={28} onClick={() => onStart(svc.id)} />
          )}
          {(svc.status === "running" || svc.status === "failed") && <IconBtn icon="restart" title="Restart service" size={28} onClick={() => onRestart(svc.id)} />}
          <IconBtn icon="dots" title="More actions" size={28} />
          <Icon name={expanded ? "chevD" : "chevR"} size={12} style={{ color: "var(--text-muted)", marginLeft: 2 }} />
        </span>
      </div>

      {svc.status === "failed" && svc.error && (
        <div style={{
          margin: "0 14px 12px", padding: "9px 14px",
          background: "var(--error-soft)", border: "1px solid rgba(168, 83, 72, 0.25)",
          borderRadius: 9, display: "flex", alignItems: "center", gap: 12
        }}>
          <span className="mono" style={{ fontSize: 11.5, fontWeight: 600, color: "var(--error)", whiteSpace: "nowrap" }}>{svc.error.code}</span>
          <span className="mono" style={{ fontSize: 11.5, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{svc.error.message}</span>
          <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{svc.error.time}</span>
          <SecondaryBtn icon="external" onClick={() => onToggle(svc.id, true)}>View Logs</SecondaryBtn>
        </div>
      )}

      {expanded && <ServiceDetail svc={svc} />}
    </div>
  );
}

function ServicesPage({ services, query, onStart, onStop, onRestart, onAction, onBrowse }) {
  const [expandedId, setExpandedId] = useState("svc-plastiglom");

  const toggle = (id, forceOpen = false) => setExpandedId((cur) => (forceOpen ? id : cur === id ? null : id));

  const q = query.trim().toLowerCase();
  const filtered = q
    ? services.filter((s) => s.name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q) || s.projectName.toLowerCase().includes(q) || (s.command || "").toLowerCase().includes(q))
    : services;

  return (
    <section style={{
      background: "var(--surface)", border: "1px solid var(--line-soft)",
      borderRadius: "var(--r-panel)", boxShadow: "var(--shadow-tile)", overflow: "hidden", marginBottom: 8
    }}>
      <div style={{
        display: "grid", gridTemplateColumns: SVC_GRID, gap: 12,
        padding: "10px 16px", borderBottom: "1px solid var(--line-soft)", background: "var(--bg-base)"
      }}>
        {["State", "Service", "Project", "Command / Runtime", "Port", "PID", "Uptime", "Memory"].map((h) => (
          <span key={h} className="micro">{h}</span>
        ))}
        <span className="micro" style={{ textAlign: "right" }}>Actions</span>
      </div>

      {filtered.map((svc) => (
        <ServiceRow key={svc.id} svc={svc} expanded={expandedId === svc.id}
          onToggle={toggle} onStart={onStart} onStop={onStop} onRestart={onRestart} onAction={onAction} />
      ))}

      {filtered.length === 0 && (
        <div style={{ padding: "56px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--text-secondary)" }}>No active services detected.</div>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 6 }}>Launch a project or start a configured service to see it here.</div>
          <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
            <SecondaryBtn icon="grid" onClick={onBrowse}>Go to Projects</SecondaryBtn>
          </div>
        </div>
      )}
    </section>
  );
}

window.ServicesPage = ServicesPage;
