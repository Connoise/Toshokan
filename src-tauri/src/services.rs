//! Services (C5/C6) — tauri layer over toshokan_core::supervisor.
//! Owns spec/meta assembly from project manifests, forwards supervisor events
//! to the UI (`service://status`, `service://log`), and runs the ~1.5s
//! telemetry sampling loop (sysinfo).

use crate::state::AppState;
use crate::util::expand;
use serde::Serialize;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::mpsc::Receiver;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use sysinfo::{Pid, ProcessRefreshKind, System};
use tauri::{AppHandle, Emitter, Manager};
use toshokan_core::model::{LogLine, ServiceError, ServiceKind, ServiceState};
use toshokan_core::scanner::slugify;
use toshokan_core::supervisor::{ServiceSpec, Supervisor, SupervisorConfig, SupervisorEvent};
use toshokan_core::timefmt::{humanize_epoch, now_epoch};
use toshokan_core::{manifest, schedule};

// ---- DTOs (mirror src/ipc/types.ts) ------------------------------------------

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ServiceDetailDto {
    pub launch_command: String,
    pub working_dir: String,
    pub local_url: Option<String>,
    pub started: String,
    pub user: String,
    pub environment: String,
    pub log: Vec<serde_json::Value>, // backfilled separately via get_log
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ServiceDto {
    pub id: String,
    pub name: String,
    pub role: String,
    pub project_id: String,
    pub project_name: String,
    pub project_desc: String,
    pub runtime: String,
    pub command: String,
    pub port: Option<String>,
    pub pid: Option<String>,
    pub uptime: Option<String>,
    pub ram: Option<u64>,
    pub status: ServiceState,
    pub kind: ServiceKind,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub schedule: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_run: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_run: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<ServiceError>,
    pub detail: ServiceDetailDto,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ServiceStatusUpdate {
    pub id: String,
    pub status: ServiceState,
    pub pid: Option<String>,
    pub port: Option<String>,
    pub uptime_sec: Option<i64>,
    pub ram_mb: Option<u64>,
}

/// Static display metadata per service (rebuilt on every scan).
#[derive(Clone)]
pub struct SvcMeta {
    pub name: String,
    pub role: String,
    pub project_id: String,
    pub project_name: String,
    pub project_desc: String,
    pub runtime: String,
    pub command: String,
    pub port: Option<u16>,
    pub url: Option<String>,
    pub working_dir_display: String,
}

pub struct ServicesState {
    pub supervisor: Arc<Supervisor>,
    pub meta: Mutex<HashMap<String, SvcMeta>>,
    pub ram: Mutex<HashMap<String, u64>>, // latest sampled MB per live service
    pub overlay_dir: PathBuf,
}

// ---- setup --------------------------------------------------------------------

/// Bundled overlay manifests for the seven catalogued projects (PLAN §8),
/// written to `<config>/manifests/` on first launch only — user edits win after.
const SEED_MANIFESTS: &[(&str, &str)] = &[
    ("idolmancer", include_str!("../manifests/idolmancer.yml")),
    ("jagaimo", include_str!("../manifests/jagaimo.yml")),
    ("sando", include_str!("../manifests/sando.yml")),
    ("plastiglom", include_str!("../manifests/plastiglom.yml")),
    ("frogbudget", include_str!("../manifests/frogbudget.yml")),
    ("inventorois", include_str!("../manifests/inventorois.yml")),
    ("kanimiso", include_str!("../manifests/kanimiso.yml")),
];

pub fn init(app: &AppHandle, config_dir: &std::path::Path, data_dir: &std::path::Path) {
    let overlay_dir = config_dir.join("manifests");
    if !overlay_dir.exists() {
        let _ = std::fs::create_dir_all(&overlay_dir);
        for (id, text) in SEED_MANIFESTS {
            let _ = std::fs::write(overlay_dir.join(format!("{id}.yml")), text);
        }
    }

    let (supervisor, rx) = Supervisor::new(SupervisorConfig {
        log_dir: Some(data_dir.join("logs")),
        ..SupervisorConfig::default()
    });

    app.manage(ServicesState {
        supervisor,
        meta: Mutex::new(HashMap::new()),
        ram: Mutex::new(HashMap::new()),
        overlay_dir,
    });

    spawn_event_forwarder(app.clone(), rx);
    spawn_sampler(app.clone());
}

/// Rebuild specs + display metadata from the discovered projects' manifests.
/// Called after every scan. Running services keep their old spec until restart.
pub fn sync_specs(app: &AppHandle) {
    let projects = app.state::<AppState>().projects.lock().unwrap().clone();
    let svc = app.state::<ServicesState>();

    let mut meta = HashMap::new();
    for p in &projects {
        let project_path = expand(&p.path);
        let Some(m) = manifest::load(&project_path, &p.id, Some(&svc.overlay_dir)) else {
            continue;
        };
        for s in &m.services {
            let id = format!("svc-{}-{}", p.id, slugify(&s.name));
            let cwd = match &s.cwd {
                Some(rel) if rel != "." => project_path.join(rel),
                _ => project_path.clone(),
            };
            let env_files = s.env.clone().unwrap_or_else(|| if m.env.is_empty() { vec![".env".to_string()] } else { m.env.clone() });
            let kind = ServiceKind::from_str_loose(&s.kind);

            svc.supervisor.register(ServiceSpec {
                id: id.clone(),
                kind,
                command: s.command.clone(),
                cwd: cwd.clone(),
                env_files,
                schedule: s.schedule.clone(),
            });

            let url = s.url.clone().or_else(|| s.port.map(|pt| format!("http://localhost:{pt}")));
            meta.insert(
                id,
                SvcMeta {
                    name: m.name.clone().unwrap_or_else(|| p.name.clone()),
                    role: s.name.clone(),
                    project_id: p.id.clone(),
                    project_name: p.name.clone(),
                    project_desc: p.desc.clone(),
                    runtime: s.runtime.clone().unwrap_or_else(|| runtime_from_command(&s.command)),
                    command: s.command.clone(),
                    port: s.port,
                    url,
                    working_dir_display: display_dir(&p.path, s.cwd.as_deref()),
                },
            );
        }
    }
    *svc.meta.lock().unwrap() = meta;
}

fn display_dir(project_path: &str, cwd: Option<&str>) -> String {
    match cwd {
        Some(rel) if rel != "." => format!("{}/{}", project_path.trim_end_matches('/'), rel),
        _ => project_path.to_string(),
    }
}

fn runtime_from_command(command: &str) -> String {
    let first = command.split_whitespace().next().unwrap_or("");
    match first {
        "npm" | "pnpm" | "yarn" => "Node",
        "python" | "python3" => "Python",
        "cargo" => "Rust",
        "caddy" => "Caddy",
        other => return other.to_string(),
    }
    .to_string()
}

// ---- assembly -------------------------------------------------------------------

pub fn build_dtos(svc: &ServicesState) -> Vec<ServiceDto> {
    let meta = svc.meta.lock().unwrap().clone();
    let ram = svc.ram.lock().unwrap().clone();
    let now = now_epoch();
    let user = std::env::var("USER").or_else(|_| std::env::var("USERNAME")).unwrap_or_else(|_| "local".into());

    let mut out: Vec<ServiceDto> = Vec::new();
    for (id, m) in &meta {
        let Some(info) = svc.supervisor.info(id) else { continue };
        let live = matches!(info.status, ServiceState::Running | ServiceState::Starting);
        let next_run = info
            .schedule
            .as_deref()
            .and_then(|expr| schedule::next_run_epoch(expr, now))
            .map(|t| schedule::humanize_in(t, now));
        out.push(ServiceDto {
            id: id.clone(),
            name: m.name.clone(),
            role: m.role.clone(),
            project_id: m.project_id.clone(),
            project_name: m.project_name.clone(),
            project_desc: m.project_desc.clone(),
            runtime: m.runtime.clone(),
            command: m.command.clone(),
            port: m.port.map(|p| format!("localhost:{p}")),
            pid: info.pid.map(|p| p.to_string()),
            uptime: if live { info.started_epoch.map(|s| schedule::format_uptime(now - s)) } else { None },
            ram: if live { ram.get(id).copied() } else { None },
            status: info.status,
            kind: info.kind,
            schedule: info.schedule.clone(),
            last_run: info.last_run_epoch.map(|t| schedule::humanize_ago(t, now)),
            next_run,
            error: info.error.clone(),
            detail: ServiceDetailDto {
                launch_command: m.command.clone(),
                working_dir: m.working_dir_display.clone(),
                local_url: m.url.clone(),
                started: if live { info.started_epoch.map(|s| humanize_epoch(s, now)).unwrap_or_else(|| "—".into()) } else { "—".into() },
                user: user.clone(),
                environment: "LOCAL".into(),
                log: Vec::new(),
            },
        });
    }
    // stable order: project name, then role
    out.sort_by(|a, b| a.project_name.cmp(&b.project_name).then(a.role.cmp(&b.role)));
    out
}

// ---- background threads ----------------------------------------------------------

fn spawn_event_forwarder(app: AppHandle, rx: Receiver<SupervisorEvent>) {
    std::thread::spawn(move || {
        while let Ok(event) = rx.recv() {
            match event {
                SupervisorEvent::Status { id, status, pid, .. } => {
                    let (port, uptime_sec) = {
                        let svc = app.state::<ServicesState>();
                        let port = svc.meta.lock().unwrap().get(&id).and_then(|m| m.port.map(|p| format!("localhost:{p}")));
                        let up = svc
                            .supervisor
                            .info(&id)
                            .and_then(|i| i.started_epoch)
                            .filter(|_| matches!(status, ServiceState::Running | ServiceState::Starting))
                            .map(|s| now_epoch() - s);
                        (port, up)
                    };
                    let _ = app.emit(
                        "service://status",
                        ServiceStatusUpdate { id, status, pid: pid.map(|p| p.to_string()), port, uptime_sec, ram_mb: None },
                    );
                }
                SupervisorEvent::Log { id, line } => {
                    #[derive(Serialize, Clone)]
                    struct LogEvent {
                        id: String,
                        line: LogLine,
                    }
                    let _ = app.emit("service://log", LogEvent { id, line });
                }
            }
        }
    });
}

/// ~1.5s loop: sample per-PID memory + uptime for live services (HANDOFF C5).
fn spawn_sampler(app: AppHandle) {
    std::thread::spawn(move || {
        let mut sys = System::new();
        loop {
            std::thread::sleep(Duration::from_millis(1500));
            let svc = app.state::<ServicesState>();
            let now = now_epoch();
            for info in svc.supervisor.snapshot() {
                if !matches!(info.status, ServiceState::Running | ServiceState::Starting) {
                    continue;
                }
                let Some(pid) = info.pid else { continue };
                let spid = Pid::from_u32(pid);
                sys.refresh_process_specifics(spid, ProcessRefreshKind::new().with_memory());
                let ram_mb = sys.process(spid).map(|p| p.memory() / (1024 * 1024));
                if let Some(mb) = ram_mb {
                    svc.ram.lock().unwrap().insert(info.id.clone(), mb);
                }
                let port = svc.meta.lock().unwrap().get(&info.id).and_then(|m| m.port.map(|p| format!("localhost:{p}")));
                let _ = app.emit(
                    "service://status",
                    ServiceStatusUpdate {
                        id: info.id.clone(),
                        status: info.status,
                        pid: Some(pid.to_string()),
                        port,
                        uptime_sec: info.started_epoch.map(|s| now - s),
                        ram_mb,
                    },
                );
            }
        }
    });
}

// ---- commands ---------------------------------------------------------------------

#[tauri::command]
pub fn list_services(svc: tauri::State<ServicesState>) -> Vec<ServiceDto> {
    build_dtos(&svc)
}

#[tauri::command]
pub fn start_service(svc: tauri::State<ServicesState>, id: String) -> Result<(), String> {
    svc.supervisor.start(&id)
}

#[tauri::command]
pub fn stop_service(svc: tauri::State<ServicesState>, id: String) -> Result<(), String> {
    svc.supervisor.stop(&id)
}

#[tauri::command]
pub fn restart_service(svc: tauri::State<ServicesState>, id: String) -> Result<(), String> {
    svc.supervisor.restart(&id)
}

#[tauri::command]
pub fn get_log(svc: tauri::State<ServicesState>, id: String) -> Vec<LogLine> {
    svc.supervisor.get_log(&id)
}

#[tauri::command]
pub fn save_log(svc: tauri::State<ServicesState>, id: String) -> Result<String, String> {
    svc.supervisor.save_log(&id)
}

#[tauri::command]
pub fn clear_log(svc: tauri::State<ServicesState>, id: String) {
    svc.supervisor.clear_log(&id)
}
