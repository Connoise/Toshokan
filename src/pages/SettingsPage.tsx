// Toshokan — Settings page (interface + project-management preferences).
// The prototype's dev Tweaks panel is gone (PLAN Q19); these real controls
// drive the live appearance state, lifted into App and persisted via config.
import { useState, type ReactNode } from "react";
import { Icon, BrandMark, PrimaryBtn, SecondaryBtn, IconBtn } from "../components/shared";
import type { Appearance } from "../ipc";

// ---- Primitive controls -----------------------------------------------------
function Switch({ checked, onChange, labelledby }: { checked: boolean; onChange: (v: boolean) => void; labelledby?: string }) {
  return (
    <button role="switch" aria-checked={checked} aria-labelledby={labelledby} onClick={() => onChange(!checked)}
      style={{
        width: 42, height: 24, flexShrink: 0, padding: 2, borderRadius: 999,
        border: "1px solid " + (checked ? "var(--signal)" : "var(--line)"),
        background: checked ? "var(--signal)" : "var(--surface-recessed)",
        position: "relative", cursor: "pointer", transition: "background 140ms ease, border-color 140ms ease",
      }}>
      <span style={{
        position: "absolute", top: 2, left: checked ? 20 : 2, width: 18, height: 18, borderRadius: "50%",
        background: checked ? "#fff" : "var(--surface)", boxShadow: "0 1px 2px rgba(23,27,29,0.35)",
        transition: "left 140ms cubic-bezier(.3,.7,.4,1)",
      }}></span>
    </button>
  );
}

interface SegOption { value: string; label: string; icon?: string }
function Segment({ value, options, onChange }: { value: string; options: SegOption[]; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "inline-flex", padding: 3, gap: 3, borderRadius: 10, background: "var(--surface-recessed)", border: "1px solid var(--line-soft)" }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button key={o.value} onClick={() => onChange(o.value)}
            style={{
              display: "flex", alignItems: "center", gap: 7, padding: "6px 14px", borderRadius: 7, fontSize: 13, fontWeight: 600,
              color: active ? "var(--text-primary)" : "var(--text-secondary)",
              background: active ? "var(--surface)" : "transparent",
              border: "1px solid " + (active ? "var(--line-soft)" : "transparent"),
              boxShadow: active ? "var(--shadow-tile)" : "none", transition: "background 130ms ease",
            }}>
            {o.icon && <Icon name={o.icon} size={15} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Select({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{
          appearance: "none", WebkitAppearance: "none", padding: "8px 34px 8px 12px", borderRadius: "var(--r-control)",
          border: "1px solid var(--line)", background: "var(--surface)", color: "var(--text-primary)",
          fontSize: 13, fontWeight: 600, fontFamily: "var(--font-sans)", cursor: "pointer", minWidth: 180,
        }}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <span style={{ position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--text-muted)" }}>
        <Icon name="chevD" size={15} />
      </span>
    </div>
  );
}

// ---- Layout pieces ----------------------------------------------------------
function SettingsCard({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <section style={{ background: "var(--surface)", border: "1px solid var(--line-soft)", borderRadius: "var(--r-panel)", boxShadow: "var(--shadow-tile)", overflow: "hidden" }}>
      <header style={{ padding: "18px 22px 14px", borderBottom: "1px solid var(--line-soft)" }}>
        <h2 style={{ margin: 0, fontSize: 16.5, fontWeight: 700, letterSpacing: "-0.01em" }}>{title}</h2>
        {desc && <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 3 }}>{desc}</div>}
      </header>
      <div>{children}</div>
    </section>
  );
}

function Row({ id, label, hint, children, last }: { id?: string; label: string; hint?: string; children: ReactNode; last?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "15px 22px", borderBottom: last ? "none" : "1px solid var(--line-soft)" }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div id={id} style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
        {hint && <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 3, textWrap: "pretty" }}>{hint}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

// ---- Project directories ----------------------------------------------------
function DirectoryManager() {
  const [dirs, setDirs] = useState([
    { path: "~/Projects", scan: true },
  ]);
  const [draft, setDraft] = useState("");

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    setDirs((d) => [...d, { path: v, scan: true }]);
    setDraft("");
  };

  return (
    <div>
      <div style={{ padding: "6px 0" }}>
        {dirs.map((d, i) => (
          <div key={d.path + i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 22px", borderBottom: "1px solid var(--line-soft)" }}>
            <Icon name="folder" size={18} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            <span className="mono" style={{ fontSize: 13, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.path}</span>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-secondary)", flexShrink: 0 }}>
              <span className="micro">Auto-scan</span>
              <Switch checked={d.scan} onChange={(v) => setDirs((arr) => arr.map((x, j) => (j === i ? { ...x, scan: v } : x)))} />
            </label>
            <IconBtn icon="trash" title={"Remove " + d.path} size={30} onClick={() => setDirs((arr) => arr.filter((_, j) => j !== i))} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, padding: "14px 22px 18px", alignItems: "center" }}>
        <span style={{ position: "relative", flex: 1, display: "flex" }}>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }}
            placeholder="Add a workspace directory, e.g. ~/Projects" className="mono"
            style={{ flex: 1, padding: "10px 13px", fontSize: 13, border: "1px solid var(--line)", borderRadius: "var(--r-control)", background: "var(--bg-base)", color: "var(--text-primary)" }} />
        </span>
        <PrimaryBtn icon="plus" onClick={add}>Add directory</PrimaryBtn>
      </div>
    </div>
  );
}

// ---- Page -------------------------------------------------------------------
interface SettingsPageProps {
  appearance: Appearance;
  onAppearanceChange: <K extends keyof Appearance>(key: K, value: Appearance[K]) => void;
}

export function SettingsPage({ appearance, onAppearanceChange }: SettingsPageProps) {
  const isDark = appearance.theme === "Basalt Dark";

  const [mgmt, setMgmt] = useState({
    editor: "VS Code",
    terminal: "Default terminal",
    restoreSession: true,
    confirmStop: true,
    rescanOnLaunch: false,
    defaultBranch: "main",
    vaultRoot: "",
  });
  const setM = <K extends keyof typeof mgmt>(k: K, v: (typeof mgmt)[K]) => setMgmt((m) => ({ ...m, [k]: v }));

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20, paddingBottom: 12 }}>
      <SettingsCard title="Appearance" desc="How the Toshokan interface looks on this machine.">
        <Row id="set-theme" label="Theme" hint="Switch between the Lithic Light and Basalt Dark palettes.">
          <Segment value={isDark ? "dark" : "light"}
            options={[{ value: "light", label: "Light", icon: "image" }, { value: "dark", label: "Dark", icon: "layers" }]}
            onChange={(v) => onAppearanceChange("theme", v === "dark" ? "Basalt Dark" : "Lithic Light")} />
        </Row>
        <Row id="set-density" label="Interface density" hint="Compact tightens vertical spacing across all pages.">
          <Segment value={appearance.density}
            options={[{ value: "regular", label: "Regular" }, { value: "compact", label: "Compact" }]}
            onChange={(v) => onAppearanceChange("density", v as Appearance["density"])} />
        </Row>
        <Row id="set-emblem" label="Show rail emblem" hint="Display the engraved shield mark at the base of the navigation rail." last>
          <Switch checked={appearance.railEmblem} onChange={(v) => onAppearanceChange("railEmblem", v)} labelledby="set-emblem" />
        </Row>
      </SettingsCard>

      <SettingsCard title="Project Directories" desc="Folders Toshokan watches for projects. Auto-scan picks up new projects on launch.">
        <DirectoryManager />
      </SettingsCard>

      <SettingsCard title="Notes" desc="Where Toshokan looks for an Obsidian note matching each project (read-only).">
        <Row id="set-vault" label="Obsidian vault root" hint="Absolute path to your vault; a same-named note becomes the project summary." last>
          <input value={mgmt.vaultRoot} onChange={(e) => setM("vaultRoot", e.target.value)} placeholder="~/Obsidian/Vault" className="mono"
            style={{ padding: "8px 12px", fontSize: 13, width: 240, border: "1px solid var(--line)", borderRadius: "var(--r-control)", background: "var(--surface)", color: "var(--text-primary)" }} />
        </Row>
      </SettingsCard>

      <SettingsCard title="Project Management" desc="Defaults applied when launching, opening, and managing projects.">
        <Row id="set-editor" label="Default editor" hint="Opens when you choose “Open in editor”.">
          <Select value={mgmt.editor} options={["VS Code", "Cursor", "Neovim", "Zed", "Sublime Text"]} onChange={(v) => setM("editor", v)} />
        </Row>
        <Row id="set-terminal" label="Default terminal" hint="Used for “Open terminal” and launch commands.">
          <Select value={mgmt.terminal} options={["Default terminal", "GNOME Terminal", "Konsole", "Alacritty", "Windows Terminal"]} onChange={(v) => setM("terminal", v)} />
        </Row>
        <Row id="set-branch" label="Branch to display" hint="Which branch the project header reports by default.">
          <input value={mgmt.defaultBranch} onChange={(e) => setM("defaultBranch", e.target.value)} className="mono"
            style={{ padding: "8px 12px", fontSize: 13, width: 180, border: "1px solid var(--line)", borderRadius: "var(--r-control)", background: "var(--surface)", color: "var(--text-primary)" }} />
        </Row>
        <Row id="set-restore" label="Restore last session" hint="Reopen the project and tab you were last viewing.">
          <Switch checked={mgmt.restoreSession} onChange={(v) => setM("restoreSession", v)} labelledby="set-restore" />
        </Row>
        <Row id="set-rescan" label="Re-scan directories on launch" hint="Refresh the project list from disk every time a project launches.">
          <Switch checked={mgmt.rescanOnLaunch} onChange={(v) => setM("rescanOnLaunch", v)} labelledby="set-rescan" />
        </Row>
        <Row id="set-confirm" label="Confirm before stopping services" hint="Ask for confirmation before stopping a running service." last>
          <Switch checked={mgmt.confirmStop} onChange={(v) => setM("confirmStop", v)} labelledby="set-confirm" />
        </Row>
      </SettingsCard>

      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 22px", background: "var(--surface)", border: "1px solid var(--line-soft)", borderRadius: "var(--r-panel)", boxShadow: "var(--shadow-tile)" }}>
        <BrandMark size={34} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>Toshokan</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Version 0.5.0 · All data is stored locally</div>
        </div>
        <SecondaryBtn icon="book" onClick={() => {}}>Documentation</SecondaryBtn>
      </div>
    </div>
  );
}
