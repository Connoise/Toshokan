// Toshokan — shared components: icons, chips, nodes, placeholders, buttons.
// Ported from the prototype's shared.jsx (visual design is final).
import { useState, type CSSProperties, type ReactNode, type MouseEvent } from "react";

// ---- Icon library ---------------------------------------------------------
// Simple geometric strokes on a 24px grid (design guide §9).
const ICON_PATHS: Record<string, ReactNode> = {
  grid: <g><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></g>,
  rows: <g><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" /></g>,
  folder: <path d="M4 7a2 2 0 0 1 2-2h4l2 2.5h6a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" />,
  file: <g><path d="M7 3.5h7L18.5 8v11a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 18V5A1.5 1.5 0 0 1 7 3.5z" /><path d="M14 3.5V8h4.5" /></g>,
  image: <g><rect x="4" y="5" width="16" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M4 16.5 9 12l4 3.5 3-2.5 4 3.5" /></g>,
  pulse: <path d="M3 12h4l2.5-6 4 12 2.5-6h5" />,
  search: <g><circle cx="11" cy="11" r="6" /><line x1="15.5" y1="15.5" x2="20" y2="20" /></g>,
  sliders: <g><line x1="5" y1="7" x2="19" y2="7" /><line x1="5" y1="12" x2="19" y2="12" /><line x1="5" y1="17" x2="19" y2="17" /><circle cx="9" cy="7" r="2" fill="var(--surface)" /><circle cx="15" cy="12" r="2" fill="var(--surface)" /><circle cx="7" cy="17" r="2" fill="var(--surface)" /></g>,
  play: <path d="M8.5 6.2v11.6c0 .7.8 1.1 1.4.8l9-5.8a.9.9 0 0 0 0-1.6l-9-5.8a.9.9 0 0 0-1.4.8z" />,
  stop: <rect x="7" y="7" width="10" height="10" rx="1.5" />,
  restart: <g><path d="M19 12a7 7 0 1 1-2.5-5.4" /><path d="M19 3.5V7h-3.5" /></g>,
  dots: <g><circle cx="12" cy="5.5" r="1.4" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="12" cy="18.5" r="1.4" fill="currentColor" stroke="none" /></g>,
  chevR: <path d="M9.5 6.5 15 12l-5.5 5.5" />,
  chevD: <path d="M6.5 9.5 12 15l5.5-5.5" />,
  external: <g><path d="M10 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19h11a1.5 1.5 0 0 0 1.5-1.5V14" /><path d="M13.5 4.5H19.5V10.5" /><line x1="19" y1="5" x2="11.5" y2="12.5" /></g>,
  terminal: <g><rect x="3.5" y="5" width="17" height="14" rx="2" /><path d="M7.5 10l3 2.5-3 2.5" /><line x1="12.5" y1="15.5" x2="16.5" y2="15.5" /></g>,
  book: <g><path d="M4.5 5.5A1.5 1.5 0 0 1 6 4h5.5v15.5H6a1.5 1.5 0 0 0-1.5 1.5V5.5z" /><path d="M19.5 5.5A1.5 1.5 0 0 0 18 4h-5.5v15.5H18a1.5 1.5 0 0 1 1.5 1.5V5.5z" /></g>,
  branch: <g><circle cx="7" cy="6" r="2.2" /><circle cx="7" cy="18" r="2.2" /><circle cx="17" cy="8" r="2.2" /><path d="M7 8.2v7.6" /><path d="M17 10.2c0 4-10 2.5-10 6" /></g>,
  copy: <g><rect x="8.5" y="8.5" width="11" height="11" rx="1.5" /><path d="M5.5 14.5h-1V5.5a1 1 0 0 1 1-1h9v1" /></g>,
  clock: <g><circle cx="12" cy="12" r="8" /><path d="M12 7.5V12l3 2" /></g>,
  refresh: <g><path d="M5 12a7 7 0 0 1 12-4.9" /><path d="M17.5 3.8V7.5H13.8" /><path d="M19 12a7 7 0 0 1-12 4.9" /><path d="M6.5 20.2v-3.7h3.7" /></g>,
  layers: <g><path d="M12 3.5 20 8l-8 4.5L4 8l8-4.5z" /><path d="M4 12.5l8 4.5 8-4.5" /><path d="M4 17l8 4.5L20 17" opacity="0.45" /></g>,
  download: <g><path d="M12 4v10" /><path d="M7.5 10.5 12 15l4.5-4.5" /><path d="M5 19h14" /></g>,
  trash: <g><path d="M5 7h14" /><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /><path d="M7 7l1 12.5a1 1 0 0 0 1 .5h6a1 1 0 0 0 1-.5L17 7" /></g>,
  collapse: <g><path d="M8 4v5H4" /><path d="M16 20v-5h4" /><path d="M16 4v5h4" /><path d="M8 20v-5H4" /></g>,
  plus: <g><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></g>,
  gear: <g><circle cx="12" cy="12" r="3.2" /><path d="M12 2.5v2.6M12 18.9v2.6M21.5 12h-2.6M5.1 12H2.5M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8M18.7 18.7l-1.8-1.8M7.1 7.1 5.3 5.3" /></g>,
};

export function Icon({ name, size = 16, stroke = 1.75, style }: { name: string; size?: number; stroke?: number; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true">
      {ICON_PATHS[name] || <circle cx="12" cy="12" r="7" />}
    </svg>
  );
}

// ---- Mineral node (state dot) --------------------------------------------
export type NodeState = "running" | "starting" | "stopped" | "failed" | "signal" | "neutral";
const NODE_COLORS: Record<NodeState, string> = {
  running: "var(--running)",
  starting: "var(--signal)",
  stopped: "var(--line)",
  failed: "var(--error)",
  signal: "var(--signal)",
  neutral: "var(--slate)",
};

export function Node({ state = "neutral", size = 7, pulse = false }: { state?: NodeState; size?: number; pulse?: boolean }) {
  const hollow = state === "stopped";
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        background: hollow ? "transparent" : NODE_COLORS[state],
        border: hollow ? `1.5px solid ${NODE_COLORS.stopped}` : "none",
        boxShadow: !hollow && (state === "running" || state === "starting") ? `0 0 0 3px ${state === "running" ? "var(--running-soft)" : "var(--signal-soft)"}` : "none",
        animation: pulse ? "tsk-pulse 2.2s ease-in-out infinite" : "none",
      }}
    ></span>
  );
}

// ---- Placeholder slot ------------------------------------------------------
export function Slot({ label, width = "100%", height = 48, radius = 8, style, hideLabel = false }: { label: string; width?: number | string; height?: number; radius?: number; style?: CSSProperties; hideLabel?: boolean }) {
  return (
    <div
      data-asset-slot={label}
      style={{
        width, height, borderRadius: radius,
        border: "1px dashed var(--line)", background: "var(--placeholder-stripe)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, overflow: "hidden", ...style,
      }}
    >
      {!hideLabel && <span className="micro" style={{ opacity: 0.85, textAlign: "center", padding: "0 6px" }}>{label}</span>}
    </div>
  );
}

// ---- Specimen frame (octagonal project icon holder) ------------------------
export const OCTAGON = "polygon(29% 2%, 71% 2%, 98% 29%, 98% 71%, 71% 98%, 29% 98%, 2% 71%, 2% 29%)";

// Project icon artwork (512px masters). Art includes the octagonal glass frame.
const ICON_ART: Record<string, string> = {
  "Idolmancer": "/assets/icon-idolmancer.png",
  "Jagaimo": "/assets/icon-jagaimo.png",
  "Sando": "/assets/icon-sando.png",
  "Plastiglom": "/assets/icon-plastiglom.png",
  "Frog Budget": "/assets/icon-frogbudget.png",
  "Inventorois": "/assets/icon-inventorois.png",
  "Kani-miso": "/assets/icon-kanimiso.png",
};

export function SpecimenFrame({ size = 64, label = "project icon", selected = false }: { size?: number; label?: string; selected?: boolean }) {
  const name = label.startsWith("icon: ") ? label.slice(6) : label;
  const art = ICON_ART[name];
  if (art) {
    const artDark = art.replace(".png", "-dark.png");
    // multiply (light) / screen (dark) lets the glass plaque adopt the surface beneath it.
    const imgBase: CSSProperties = {
      width: "100%", height: "100%", objectFit: "contain",
      filter: selected ? "drop-shadow(0 0 5px var(--signal))" : "drop-shadow(0 1px 2px rgba(23,27,29,0.18))",
    };
    return (
      <div style={{ width: size, height: size, position: "relative", flexShrink: 0 }}>
        <img className="tsk-icon-light" src={art} alt={`${name} icon`} width={size} height={size} style={{ ...imgBase, mixBlendMode: "multiply" }} />
        <img className="tsk-icon-dark" src={artDark} alt={`${name} icon`} width={size} height={size} style={{ ...imgBase, mixBlendMode: "screen" }} />
      </div>
    );
  }
  return (
    <div style={{ width: size, height: size, position: "relative", flexShrink: 0 }}>
      <div style={{
        position: "absolute", inset: 0, clipPath: OCTAGON,
        background: selected ? "linear-gradient(155deg, var(--signal-soft), var(--surface-recessed))" : "linear-gradient(155deg, var(--surface), var(--surface-recessed))",
        border: "1px solid var(--line)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
      }}></div>
      <div style={{
        position: "absolute", inset: Math.max(3, size * 0.06), clipPath: OCTAGON,
        background: "var(--placeholder-stripe)", border: "1px dashed var(--line-soft)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }} data-asset-slot={label}>
        {size >= 56 && <span className="micro" style={{ fontSize: 9, textAlign: "center", lineHeight: 1.3 }}>icon</span>}
      </div>
    </div>
  );
}

// ---- Brand mark (Toshokan app logo, light/dark variants) --------------------
export function BrandMark({ size = 18, style }: { size?: number; style?: CSSProperties }) {
  const imgBase: CSSProperties = { width: size, height: size, objectFit: "contain", verticalAlign: "top" };
  return (
    <span style={{ width: size, height: size, display: "inline-block", flexShrink: 0, ...style }}>
      <img className="tsk-icon-light" src="/assets/app-icon.png" alt="Toshokan" width={size} height={size} style={{ ...imgBase, mixBlendMode: "multiply" }} />
      <img className="tsk-icon-dark" src="/assets/app-icon-dark.png" alt="Toshokan" width={size} height={size} style={{ ...imgBase, mixBlendMode: "screen" }} />
    </span>
  );
}

// ---- Chips ------------------------------------------------------------------
export function TechChip({ label }: { label: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "3px 9px",
      background: "var(--surface)", border: "1px solid var(--line-soft)", borderRadius: "var(--r-chip)",
      fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", boxShadow: "var(--shadow-chip)",
    }}>
      {label}
    </span>
  );
}

export function PathChip({ path, copyable = false }: { path: string; copyable?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="mono" style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 8px",
      background: "var(--surface-recessed)", border: "1px solid var(--line-soft)", borderRadius: "var(--r-chip)",
      fontSize: 11.5, color: "var(--text-secondary)", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
    }}>
      {path}
      {copyable && (
        <button title="Copy path" aria-label="Copy path" onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1200); }}
          style={{ display: "flex", color: copied ? "var(--running)" : "var(--text-muted)" }}>
          <Icon name="copy" size={13} />
        </button>
      )}
    </span>
  );
}

export function StatusChip({ label, state = "neutral", pulse = false }: { label: string; state?: NodeState; pulse?: boolean }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 9px",
      background: "var(--surface)", border: "1px solid var(--line-soft)", borderRadius: "var(--r-chip)",
      fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: "0.07em",
      color: "var(--text-secondary)", textTransform: "uppercase",
    }}>
      <Node state={state} size={6} pulse={pulse} />
      {label}
    </span>
  );
}

// ---- Buttons ----------------------------------------------------------------
type BtnClick = (e: MouseEvent<HTMLButtonElement>) => void;

export function PrimaryBtn({ children, icon, onClick, style, big = false }: { children: ReactNode; icon?: string; onClick?: BtnClick; style?: CSSProperties; big?: boolean }) {
  const [hover, setHover] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
        padding: big ? "10px 16px" : "8px 14px",
        background: "var(--basalt)", color: "var(--basalt-text)", borderRadius: "var(--r-control)",
        fontSize: 14, fontWeight: 600,
        boxShadow: hover ? "0 2px 10px rgba(23,27,29,0.28), inset 0 1px 0 rgba(255,255,255,0.12)" : "0 1px 4px rgba(23,27,29,0.22), inset 0 1px 0 rgba(255,255,255,0.08)",
        transition: "box-shadow 150ms ease, transform 150ms ease",
        transform: hover ? "translateY(-1px)" : "none", ...style,
      }}>
      <span>{children}</span>
      {icon && <Icon name={icon} size={15} />}
    </button>
  );
}

export function SecondaryBtn({ children, icon, onClick, style }: { children: ReactNode; icon?: string; onClick?: BtnClick; style?: CSSProperties }) {
  const [hover, setHover] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 8, padding: "7px 12px",
        background: hover ? "var(--surface)" : "transparent", border: "1px solid var(--line-soft)",
        borderRadius: "var(--r-control)", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)",
        transition: "background 150ms ease", ...style,
      }}>
      {icon && <Icon name={icon} size={14} />}
      {children}
    </button>
  );
}

export function IconBtn({ icon, title, onClick, size = 30, disabled = false, active = false }: { icon: string; title: string; onClick?: BtnClick; size?: number; disabled?: boolean; active?: boolean }) {
  const [hover, setHover] = useState(false);
  return (
    <button title={title} aria-label={title} onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: 7, border: "1px solid " + (active ? "var(--signal)" : "var(--line-soft)"),
        background: active ? "var(--signal-soft)" : hover && !disabled ? "var(--surface-recessed)" : "var(--surface)",
        color: disabled ? "var(--text-muted)" : "var(--text-secondary)",
        opacity: disabled ? 0.45 : 1, cursor: disabled ? "default" : "pointer",
        transition: "background 130ms ease", flexShrink: 0,
      }}>
      <Icon name={icon} size={size >= 30 ? 15 : 13} />
    </button>
  );
}

// ---- Toast ------------------------------------------------------------------
export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div style={{
      position: "fixed", bottom: 52, left: "50%", transform: "translateX(-50%)",
      background: "var(--basalt)", color: "var(--basalt-text)", padding: "9px 16px",
      borderRadius: 9, fontSize: 13, boxShadow: "var(--shadow-raised)", zIndex: 300,
      display: "flex", alignItems: "center", gap: 9,
    }}>
      <Node state="signal" size={6} />
      {message}
    </div>
  );
}
