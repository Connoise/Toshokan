// Toshokan — Project detail page (overview + directory cross-section).
import { useState, useMemo } from "react";
import { Icon, Node, Slot, SpecimenFrame, TechChip, PathChip, StatusChip, PrimaryBtn, SecondaryBtn, IconBtn } from "../components/shared";
import { FIXTURE_TREE, FIXTURE_FILE_PREVIEWS } from "../ipc/fixtures";
import type { Project, Service, TreeNode } from "../ipc";

// ---- Overview column --------------------------------------------------------
function IdentityCard({ project, activeServiceCount, onLaunch, onAction }: { project: Project; activeServiceCount: number; onLaunch: (n: string) => void; onAction: (label: string) => void }) {
  const actions = [
    { label: "Open in editor", icon: "external" },
    { label: "Open directory", icon: "folder" },
    { label: "Open terminal", icon: "terminal" },
    { label: "View notes", icon: "book" },
  ];
  return (
    <section style={{
      background: "var(--surface)", border: "1px solid var(--line-soft)", borderRadius: "var(--r-panel)",
      borderTopRightRadius: 5, boxShadow: "var(--shadow-tile)", padding: 22, position: "relative",
    }}>
      <div style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
        <SpecimenFrame size={160} label={`icon: ${project.name}`} />
        <div style={{ minWidth: 0, paddingTop: 4 }}>
          <h2 style={{ margin: 0, fontSize: 23, fontWeight: 700, letterSpacing: "-0.015em" }}>{project.name}</h2>
          <div style={{ color: "var(--text-secondary)", fontSize: 13.5, marginTop: 4, textWrap: "pretty" }}>{project.desc}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
            {project.tech.map((t) => <TechChip key={t} label={t} />)}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 16 }}>
        <StatusChip label={project.repo} state="neutral" />
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 9px", background: "var(--surface)", border: "1px solid var(--line-soft)", borderRadius: "var(--r-chip)", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)" }}>
          <Icon name="branch" size={12} /> {project.branch}
        </span>
        {activeServiceCount > 0 && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 9px", background: "var(--surface)", border: "1px solid var(--line-soft)", borderRadius: "var(--r-chip)", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)" }}>
            <Icon name="pulse" size={12} /> {activeServiceCount} active
          </span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 12, color: "var(--text-secondary)", fontSize: 12.5 }}>
        <Icon name="clock" size={13} />
        Last opened <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{project.lastOpened}</span>
      </div>

      <div style={{ marginTop: 14 }}>
        <PathChip path={project.path} copyable />
      </div>

      <div style={{ marginTop: 16, display: "flex", flexDirection: "column" }}>
        <PrimaryBtn icon="play" big onClick={() => onLaunch(project.name)} style={{ width: "100%" }}>Launch</PrimaryBtn>
        <div style={{ marginTop: 10, border: "1px solid var(--line-soft)", borderRadius: 10, overflow: "hidden" }}>
          {actions.map((a, i) => (
            <ActionRow key={a.label} label={a.label} icon={a.icon} last={i === actions.length - 1} onClick={() => onAction(a.label)} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ActionRow({ label, icon, last, onClick }: { label: string; icon: string; last: boolean; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 13px", fontSize: 13.5, fontWeight: 500, color: "var(--text-primary)",
        background: hover ? "var(--surface-recessed)" : "transparent",
        borderBottom: last ? "none" : "1px solid var(--line-soft)", transition: "background 130ms ease", textAlign: "left",
      }}>
      {label}
      <Icon name={icon} size={14} style={{ color: "var(--text-muted)" }} />
    </button>
  );
}

function SummaryPanel({ project, onAction }: { project: Project; onAction: (label: string) => void }) {
  const s = project.summary;
  return (
    <section style={{
      background: "var(--surface)", border: "1px solid var(--line-soft)", borderRadius: "var(--r-panel)",
      boxShadow: "var(--shadow-tile)", padding: "18px 20px", position: "relative", overflow: "hidden",
    }}>
      <div aria-hidden="true" style={{ position: "absolute", top: 0, left: 18, right: 40, height: 2, background: "linear-gradient(90deg, var(--copper), transparent)", opacity: 0.5 }}></div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Icon name="book" size={15} style={{ color: "var(--text-secondary)" }} />
        <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 700 }}>Project Summary</h3>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>(Obsidian)</span>
        <span style={{ marginLeft: "auto" }}><Node state={s ? "running" : "stopped"} size={7} /></span>
      </div>

      {s ? (
        <div>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            {s.paragraphs.map((p, i) => (
              <p key={i} style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: "var(--text-primary)", textWrap: "pretty" }}>{p}</p>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--line-soft)" }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Updated <span style={{ color: "var(--text-secondary)" }}>{s.updated}</span></span>
            <SecondaryBtn icon="external" onClick={() => onAction("Open in Notes")} style={{ marginLeft: "auto" }}>Open in Notes</SecondaryBtn>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 12, padding: "18px 14px", borderRadius: 9, border: "1px dashed var(--line)", textAlign: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>No linked note found</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Add a matching note in your Obsidian vault to see a summary here.</div>
        </div>
      )}
    </section>
  );
}

function SubprojectsPanel({ project, onLaunch }: { project: Project; onLaunch: (n: string) => void }) {
  if (!project.subprojects.length) return null;
  return (
    <section style={{ background: "var(--surface)", border: "1px solid var(--line-soft)", borderRadius: "var(--r-panel)", boxShadow: "var(--shadow-tile)", padding: "16px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 700 }}>Subprojects</h3>
        <span className="mono" style={{ fontSize: 10.5, background: "var(--bg-base)", border: "1px solid var(--line-soft)", borderRadius: 4, padding: "0 6px", color: "var(--text-secondary)" }}>{project.subprojects.length}</span>
      </div>
      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
        {project.subprojects.map((sp) => (
          <div key={sp.name} style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--bg-base)", border: "1px solid var(--line-soft)", borderRadius: 10, padding: "9px 12px" }}>
            <SpecimenFrame size={44} label={`icon: ${sp.name}`} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{sp.name}</div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{sp.desc}</div>
            </div>
            <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{sp.lastOpened}</span>
            <IconBtn icon="play" title={`Launch ${sp.name}`} size={27} onClick={() => onLaunch(sp.name)} />
            <IconBtn icon="dots" title="More actions" size={27} />
          </div>
        ))}
      </div>
    </section>
  );
}

// ---- Directory cross-section ------------------------------------------------
interface FlatNode { node: TreeNode & { _path: string }; depth: number; expanded: boolean }

function TreeRow({ node, depth, expanded, selected, onToggle, onSelect }: { node: TreeNode & { _path: string }; depth: number; expanded: boolean; selected: boolean; onToggle: (p: string) => void; onSelect: (n: string) => void }) {
  const [hover, setHover] = useState(false);
  const isDir = node.type === "dir";
  return (
    <div role="row"
      onClick={() => (isDir ? onToggle(node._path) : onSelect(node.name))}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: "grid", gridTemplateColumns: "1fr 86px 150px", alignItems: "center", gap: 10,
        padding: "7px 16px 7px " + (16 + depth * 22) + "px",
        background: selected ? "var(--signal-soft)" : hover ? "var(--surface-recessed)" : "transparent",
        borderLeft: selected ? "2.5px solid var(--signal)" : "2.5px solid transparent",
        borderBottom: "1px solid " + (depth === 0 ? "var(--line-soft)" : "transparent"),
        cursor: "pointer", transition: "background 110ms ease",
      }}>
      <span style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
        <span style={{ width: 14, display: "flex", justifyContent: "center", color: "var(--text-muted)", flexShrink: 0 }}>
          {isDir && <Icon name={expanded ? "chevD" : "chevR"} size={12} />}
        </span>
        <Icon name={isDir ? "folder" : node.kind === "image" ? "image" : "file"} size={15} style={{ color: isDir ? "var(--slate)" : "var(--text-muted)", flexShrink: 0 }} />
        <span className="mono" style={{ fontSize: 12.5, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.name}</span>
        {node.running && <Node state="running" size={6} pulse />}
      </span>
      <span className="mono" style={{ fontSize: 11.5, color: "var(--text-muted)", textAlign: "right" }}>{node.size || "—"}</span>
      <span style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "right", whiteSpace: "nowrap" }}>{node.modified}</span>
    </div>
  );
}

function DirectoryPanel({ project, onSelectFile, selectedFile }: { project: Project; onSelectFile: (n: string) => void; selectedFile: string }) {
  const [expandedPaths, setExpandedPaths] = useState<Record<string, boolean>>({});
  const [dirQuery, setDirQuery] = useState("");

  const toggle = (path: string) => setExpandedPaths((prev) => ({ ...prev, [path]: !prev[path] }));

  const rows = useMemo(() => {
    const out: FlatNode[] = [];
    const walk = (nodes: TreeNode[], depth: number, prefix: string) => {
      for (const n of nodes) {
        if (dirQuery.trim() && depth === 0 && !n.name.toLowerCase().includes(dirQuery.trim().toLowerCase())) continue;
        const path = prefix + "/" + n.name;
        out.push({ node: { ...n, _path: path }, depth, expanded: !!expandedPaths[path] });
        if (n.type === "dir" && expandedPaths[path] && n.children) walk(n.children, depth + 1, path);
      }
    };
    walk(FIXTURE_TREE, 0, "");
    return out;
  }, [expandedPaths, dirQuery]);

  return (
    <section style={{ background: "var(--surface)", border: "1px solid var(--line-soft)", borderRadius: "var(--r-panel)", boxShadow: "var(--shadow-tile)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid var(--line-soft)" }}>
        <span className="mono" style={{ fontSize: 12.5, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 7 }}>
          {project.path}
          <Icon name="chevR" size={11} style={{ color: "var(--text-muted)" }} />
        </span>
        <IconBtn icon="copy" title="Copy path" size={26} />
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 7, background: "var(--bg-base)", border: "1px solid var(--line-soft)", borderRadius: 8, padding: "5px 10px" }}>
            <Icon name="search" size={13} style={{ color: "var(--text-muted)" }} />
            <input value={dirQuery} onChange={(e) => setDirQuery(e.target.value)} placeholder="Search in directory..." style={{ border: "none", background: "transparent", fontSize: 12.5, width: 150 }} />
          </span>
          <IconBtn icon="sliders" title="Filter options" size={28} />
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 86px 150px", gap: 10, padding: "8px 16px 8px 39px", borderBottom: "1px solid var(--line-soft)", background: "var(--bg-base)" }}>
        <span className="micro">Name</span>
        <span className="micro" style={{ textAlign: "right" }}>Size</span>
        <span className="micro" style={{ textAlign: "right" }}>Modified</span>
      </div>

      <div role="tree" aria-label="Project directory" style={{ overflowY: "auto", maxHeight: 430 }}>
        {rows.map(({ node, depth, expanded }) => (
          <TreeRow key={node._path} node={node} depth={depth} expanded={expanded}
            selected={selectedFile === node.name && node.type === "file"} onToggle={toggle} onSelect={onSelectFile} />
        ))}
      </div>
    </section>
  );
}

function FilePreview({ fileName, onAction }: { fileName: string; onAction: (label: string) => void }) {
  const preview = FIXTURE_FILE_PREVIEWS[fileName];
  return (
    <section style={{ background: "var(--surface)", border: "1px solid var(--line-soft)", borderRadius: "var(--r-panel)", boxShadow: "var(--shadow-tile)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "11px 16px", borderBottom: "1px solid var(--line-soft)" }}>
        <Icon name="file" size={15} style={{ color: "var(--text-secondary)" }} />
        <span style={{ fontSize: 13.5, fontWeight: 700 }}>{fileName}</span>
        <span style={{ marginLeft: "auto", display: "flex", gap: 14, alignItems: "center", fontSize: 12, color: "var(--text-muted)" }}>
          {preview && <span>{preview.kind}</span>}
          {preview && <span className="mono" style={{ fontSize: 11.5 }}>{preview.size}</span>}
          {preview && <span>{preview.modified}</span>}
        </span>
      </div>
      {preview ? (
        <div>
          <pre className="mono" style={{ margin: 0, padding: "14px 18px", fontSize: 12.5, lineHeight: 1.7, color: "var(--text-primary)", whiteSpace: "pre-wrap", overflowX: "auto" }}>{preview.lines.join("\n")}</pre>
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "0 16px 13px" }}>
            <SecondaryBtn icon="external" onClick={() => onAction("Open in editor")}>Open in editor</SecondaryBtn>
          </div>
        </div>
      ) : (
        <div style={{ padding: "26px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 12.5 }}>
          No preview available for this file type.
        </div>
      )}
    </section>
  );
}

// ---- Empty state ------------------------------------------------------------
function ProjectEmptyState({ onBrowse }: { onBrowse: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 90, gap: 18 }}>
      <Slot label="illustration: empty survey field / specimen outline" width={300} height={170} radius={14} />
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>Select a project to inspect its structure</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>
          Choose a specimen from the catalog, or press <span className="mono" style={{ background: "var(--surface)", border: "1px solid var(--line-soft)", borderRadius: 4, padding: "1px 6px", fontSize: 11.5 }}>Ctrl K</span> to search.
        </div>
      </div>
      <SecondaryBtn icon="grid" onClick={onBrowse}>Browse projects</SecondaryBtn>
    </div>
  );
}

// ---- Specimen tray (switch project from the Description page) ----------------
function TrayButton({ project, current, onSelect }: { project: Project; current: boolean; onSelect: (id: string) => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button title={project.name} aria-label={`View ${project.name}`} aria-current={current ? "page" : undefined}
      onClick={() => onSelect(project.id)} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 8, padding: 5, borderRadius: 10,
        border: current ? "1px solid var(--signal)" : "1px solid transparent",
        background: current ? "var(--signal-soft)" : hover ? "var(--surface-recessed)" : "transparent",
        transition: "background 130ms ease", flexShrink: 0,
      }}>
      <SpecimenFrame size={56} label={`icon: ${project.name}`} selected={current} />
    </button>
  );
}

function SpecimenTray({ projects, currentId, onSelect }: { projects: Project[]; currentId: string; onSelect: (id: string) => void }) {
  return (
    <nav aria-label="Switch project" style={{
      display: "flex", alignItems: "center", gap: 8, padding: "9px 14px",
      background: "var(--surface)", border: "1px solid var(--line-soft)", borderRadius: "var(--r-panel)",
      boxShadow: "var(--shadow-tile)", overflowX: "auto",
    }}>
      <span className="micro" style={{ flexShrink: 0, marginRight: 4 }}>Projects</span>
      {projects.map((p) => <TrayButton key={p.id} project={p} current={p.id === currentId} onSelect={onSelect} />)}
    </nav>
  );
}

// ---- Page -------------------------------------------------------------------
interface ProjectPageProps {
  project: Project | null;
  projects: Project[];
  services: Service[];
  onSelect: (id: string) => void;
  onLaunch: (name: string) => void;
  onAction: (label: string) => void;
  onBrowse: () => void;
}

export function ProjectPage({ project, projects, services, onSelect, onLaunch, onAction, onBrowse }: ProjectPageProps) {
  const [selectedFile, setSelectedFile] = useState("README.md");

  if (!project) return <ProjectEmptyState onBrowse={onBrowse} />;

  const activeServiceCount = services.filter((s) => s.projectId === project.id && (s.status === "running" || s.status === "starting")).length;
  const isIdolmancer = project.id === "idolmancer";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, paddingBottom: 8 }}>
      <SpecimenTray projects={projects} currentId={project.id} onSelect={onSelect} />
      <div style={{ display: "grid", gridTemplateColumns: "minmax(330px, 2fr) 3fr", gap: 20, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <IdentityCard project={project} activeServiceCount={activeServiceCount} onLaunch={onLaunch} onAction={onAction} />
          <SummaryPanel project={project} onAction={onAction} />
          <SubprojectsPanel project={project} onLaunch={onLaunch} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {isIdolmancer ? (
            <DirectoryPanel project={project} selectedFile={selectedFile} onSelectFile={setSelectedFile} />
          ) : (
            <section style={{ background: "var(--surface)", border: "1px solid var(--line-soft)", borderRadius: "var(--r-panel)", boxShadow: "var(--shadow-tile)", padding: "40px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-secondary)" }}>Directory index pending</div>
              <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 5 }}>This prototype carries sample directory data for Idolmancer only.</div>
            </section>
          )}
          {isIdolmancer && <FilePreview fileName={selectedFile} onAction={onAction} />}
        </div>
      </div>
    </div>
  );
}
