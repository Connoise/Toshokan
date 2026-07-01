//! C5/C6 — the service supervisor. Spawns each service command as a tracked
//! child in its working dir (with the project's .env injected), captures
//! stdout/stderr into a bounded ring buffer + a persistent per-service log
//! file, drives the starting→running/failed/stopped state machine, and kills
//! the whole process tree on stop (PLAN §4.1).
//!
//! Cross-platform: Unix spawns in a new process group and signals the group
//! (SIGTERM → SIGKILL); Windows spawns with CREATE_NO_WINDOW and kills the
//! tree via `taskkill /T`. Tauri-free so it is testable with real children.

use crate::envfile::parse_env;
use crate::logparse::to_log_line;
use crate::model::{LogLine, LogSeverity, ServiceError, ServiceKind, ServiceState};
use crate::timefmt::now_epoch;
use chrono::Local;
use std::collections::{HashMap, VecDeque};
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::mpsc::{channel, Receiver, Sender};
use std::sync::{Arc, Mutex};
use std::time::Duration;

// ---- public types ------------------------------------------------------------

#[derive(Debug, Clone)]
pub struct ServiceSpec {
    pub id: String,
    pub kind: ServiceKind,
    pub command: String,
    pub cwd: PathBuf,
    /// Env files loaded (relative to cwd) and injected into the child.
    pub env_files: Vec<String>,
    /// Cron expression (job kind).
    pub schedule: Option<String>,
}

#[derive(Debug, Clone)]
pub enum SupervisorEvent {
    Status {
        id: String,
        status: ServiceState,
        pid: Option<u32>,
        exit_code: Option<i32>,
    },
    Log {
        id: String,
        line: LogLine,
    },
}

/// A point-in-time view of one managed service.
#[derive(Debug, Clone)]
pub struct RuntimeInfo {
    pub id: String,
    pub kind: ServiceKind,
    pub status: ServiceState,
    pub pid: Option<u32>,
    pub started_epoch: Option<i64>,
    pub last_run_epoch: Option<i64>,
    pub error: Option<ServiceError>,
    pub schedule: Option<String>,
}

#[derive(Debug, Clone)]
pub struct SupervisorConfig {
    /// A child still alive after this long is considered running.
    pub grace: Duration,
    /// Time between SIGTERM and SIGKILL on stop.
    pub stop_timeout: Duration,
    /// Per-service persistent log files (Q11). None disables file logging.
    pub log_dir: Option<PathBuf>,
    /// Ring-buffer capacity per service.
    pub ring_capacity: usize,
}

impl Default for SupervisorConfig {
    fn default() -> Self {
        SupervisorConfig {
            grace: Duration::from_millis(1500),
            stop_timeout: Duration::from_secs(5),
            log_dir: None,
            ring_capacity: 2000,
        }
    }
}

// ---- internals ----------------------------------------------------------------

struct Managed {
    spec: ServiceSpec,
    status: ServiceState,
    pid: Option<u32>,
    started_epoch: Option<i64>,
    last_run_epoch: Option<i64>,
    error: Option<ServiceError>,
    ring: Arc<Mutex<VecDeque<LogLine>>>,
    last_err_line: Arc<Mutex<Option<String>>>,
    stopping: bool,
    generation: u64,
}

pub struct Supervisor {
    cfg: SupervisorConfig,
    services: Mutex<HashMap<String, Managed>>,
    tx: Sender<SupervisorEvent>,
}

impl Supervisor {
    pub fn new(cfg: SupervisorConfig) -> (Arc<Supervisor>, Receiver<SupervisorEvent>) {
        let (tx, rx) = channel();
        (Arc::new(Supervisor { cfg, services: Mutex::new(HashMap::new()), tx }), rx)
    }

    /// Add or update a spec. A live service keeps running with its old spec
    /// until restarted.
    pub fn register(&self, spec: ServiceSpec) {
        let mut map = self.services.lock().unwrap();
        match map.get_mut(&spec.id) {
            Some(m) => m.spec = spec,
            None => {
                let cap = self.cfg.ring_capacity;
                map.insert(
                    spec.id.clone(),
                    Managed {
                        spec,
                        status: ServiceState::Stopped,
                        pid: None,
                        started_epoch: None,
                        last_run_epoch: None,
                        error: None,
                        ring: Arc::new(Mutex::new(VecDeque::with_capacity(cap.min(256)))),
                        last_err_line: Arc::new(Mutex::new(None)),
                        stopping: false,
                        generation: 0,
                    },
                );
            }
        }
    }

    pub fn registered_ids(&self) -> Vec<String> {
        self.services.lock().unwrap().keys().cloned().collect()
    }

    pub fn info(&self, id: &str) -> Option<RuntimeInfo> {
        let map = self.services.lock().unwrap();
        map.get(id).map(|m| RuntimeInfo {
            id: m.spec.id.clone(),
            kind: m.spec.kind,
            status: m.status,
            pid: m.pid,
            started_epoch: m.started_epoch,
            last_run_epoch: m.last_run_epoch,
            error: m.error.clone(),
            schedule: m.spec.schedule.clone(),
        })
    }

    pub fn snapshot(&self) -> Vec<RuntimeInfo> {
        let map = self.services.lock().unwrap();
        map.values()
            .map(|m| RuntimeInfo {
                id: m.spec.id.clone(),
                kind: m.spec.kind,
                status: m.status,
                pid: m.pid,
                started_epoch: m.started_epoch,
                last_run_epoch: m.last_run_epoch,
                error: m.error.clone(),
                schedule: m.spec.schedule.clone(),
            })
            .collect()
    }

    pub fn get_log(&self, id: &str) -> Vec<LogLine> {
        let map = self.services.lock().unwrap();
        map.get(id).map(|m| m.ring.lock().unwrap().iter().cloned().collect()).unwrap_or_default()
    }

    pub fn clear_log(&self, id: &str) {
        let map = self.services.lock().unwrap();
        if let Some(m) = map.get(id) {
            m.ring.lock().unwrap().clear();
        }
        drop(map);
        if let Some(path) = self.log_file_path(id) {
            let _ = std::fs::write(path, "");
        }
    }

    /// Write the current buffer to a timestamped file; returns the path.
    pub fn save_log(&self, id: &str) -> Result<String, String> {
        let dir = self.cfg.log_dir.clone().ok_or("no log directory configured")?;
        std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        let path = dir.join(format!("{id}-{}.log", now_epoch()));
        let lines = self.get_log(id);
        let mut out = String::new();
        for l in &lines {
            out.push_str(&format!("{} [{}] {}\n", l.ts, severity_tag(l.severity), l.text));
        }
        std::fs::write(&path, out).map_err(|e| e.to_string())?;
        Ok(path.to_string_lossy().to_string())
    }

    fn log_file_path(&self, id: &str) -> Option<PathBuf> {
        self.cfg.log_dir.as_ref().map(|d| d.join(format!("{id}.log")))
    }

    // ---- lifecycle -------------------------------------------------------------

    pub fn start(self: &Arc<Self>, id: &str) -> Result<(), String> {
        let (spec, ring, last_err, gen) = {
            let mut map = self.services.lock().unwrap();
            let m = map.get_mut(id).ok_or_else(|| format!("unknown service: {id}"))?;
            if matches!(m.status, ServiceState::Running | ServiceState::Starting) {
                return Err("service is already running".to_string());
            }
            m.generation += 1;
            m.stopping = false;
            m.error = None;
            m.status = ServiceState::Starting;
            m.started_epoch = Some(now_epoch());
            *m.last_err_line.lock().unwrap() = None;
            (m.spec.clone(), m.ring.clone(), m.last_err_line.clone(), m.generation)
        };

        let mut cmd = build_command(&spec);
        let mut child = match cmd.spawn() {
            Ok(c) => c,
            Err(e) => {
                self.transition(id, gen, ServiceState::Failed, None, Some(("Spawn failed".to_string(), e.to_string())));
                return Err(e.to_string());
            }
        };
        let pid = child.id();
        {
            let mut map = self.services.lock().unwrap();
            if let Some(m) = map.get_mut(id) {
                m.pid = Some(pid);
            }
        }
        let _ = self.tx.send(SupervisorEvent::Status { id: id.to_string(), status: ServiceState::Starting, pid: Some(pid), exit_code: None });

        // persistent log file (appends across runs; Q11)
        let file = self.log_file_path(id).and_then(|p| {
            if let Some(parent) = p.parent() {
                let _ = std::fs::create_dir_all(parent);
            }
            std::fs::OpenOptions::new().append(true).create(true).open(p).ok()
        });
        let file = Arc::new(Mutex::new(file));

        // stdout / stderr readers — handles joined by the monitor so log state
        // is complete before the exit is classified
        let mut readers = Vec::new();
        if let Some(out) = child.stdout.take() {
            readers.push(self.spawn_reader(id.to_string(), out, ring.clone(), file.clone(), None));
        }
        if let Some(err) = child.stderr.take() {
            readers.push(self.spawn_reader(id.to_string(), err, ring.clone(), file.clone(), Some(last_err.clone())));
        }

        // grace: still alive after the window → running
        {
            let sup = Arc::clone(self);
            let id = id.to_string();
            let grace = self.cfg.grace;
            std::thread::spawn(move || {
                std::thread::sleep(grace);
                let mut map = sup.services.lock().unwrap();
                if let Some(m) = map.get_mut(&id) {
                    if m.generation == gen && m.status == ServiceState::Starting {
                        m.status = ServiceState::Running;
                        let pid = m.pid;
                        drop(map);
                        let _ = sup.tx.send(SupervisorEvent::Status { id, status: ServiceState::Running, pid, exit_code: None });
                    }
                }
            });
        }

        // monitor: wait for exit, classify
        {
            let sup = Arc::clone(self);
            let id = id.to_string();
            let kind = spec.kind;
            std::thread::spawn(move || {
                let status = child.wait();
                // drain the pipes fully (EOF arrives when the tree dies) so the
                // ring and last-error line are complete before classification
                for h in readers {
                    let _ = h.join();
                }
                let code = status.ok().and_then(|s| s.code());
                let (stopping, last_line) = {
                    let map = sup.services.lock().unwrap();
                    match map.get(&id) {
                        Some(m) if m.generation == gen => (m.stopping, m.last_err_line.lock().unwrap().clone()),
                        _ => return, // stale monitor from a previous run
                    }
                };
                let (state, error) = if stopping {
                    (ServiceState::Stopped, None)
                } else {
                    match code {
                        Some(0) => (ServiceState::Stopped, None),
                        Some(c) => (
                            ServiceState::Failed,
                            Some((format!("Exited with code {c}"), last_line.unwrap_or_else(|| "no error output captured".to_string()))),
                        ),
                        None => (ServiceState::Stopped, None), // signal-terminated
                    }
                };
                if state == ServiceState::Stopped && code == Some(0) && kind == ServiceKind::Job {
                    let mut map = sup.services.lock().unwrap();
                    if let Some(m) = map.get_mut(&id) {
                        m.last_run_epoch = Some(now_epoch());
                    }
                }
                sup.transition(&id, gen, state, code, error);
            });
        }

        Ok(())
    }

    /// Graceful stop: signal the process tree, escalate to a hard kill after
    /// `stop_timeout`. Returns immediately; the monitor thread reports Stopped.
    pub fn stop(self: &Arc<Self>, id: &str) -> Result<(), String> {
        let pid = {
            let mut map = self.services.lock().unwrap();
            let m = map.get_mut(id).ok_or_else(|| format!("unknown service: {id}"))?;
            if !matches!(m.status, ServiceState::Running | ServiceState::Starting) {
                // stopping a failed service just clears the banner
                if m.status == ServiceState::Failed {
                    m.status = ServiceState::Stopped;
                    m.error = None;
                    m.pid = None;
                    let _ = self.tx.send(SupervisorEvent::Status { id: id.to_string(), status: ServiceState::Stopped, pid: None, exit_code: None });
                }
                return Ok(());
            }
            m.stopping = true;
            m.pid.ok_or("service has no pid")?
        };

        terminate_tree(pid, false);
        let timeout = self.cfg.stop_timeout;
        std::thread::spawn(move || {
            let deadline = std::time::Instant::now() + timeout;
            while std::time::Instant::now() < deadline {
                if !alive(pid) {
                    return;
                }
                std::thread::sleep(Duration::from_millis(120));
            }
            terminate_tree(pid, true);
        });
        Ok(())
    }

    /// Stop then start, in the background.
    pub fn restart(self: &Arc<Self>, id: &str) -> Result<(), String> {
        let sup = Arc::clone(self);
        let id = id.to_string();
        let timeout = self.cfg.stop_timeout;
        let _ = self.stop(&id);
        std::thread::spawn(move || {
            let deadline = std::time::Instant::now() + timeout + Duration::from_secs(1);
            loop {
                let live = {
                    let map = sup.services.lock().unwrap();
                    map.get(&id).map(|m| matches!(m.status, ServiceState::Running | ServiceState::Starting)).unwrap_or(false)
                };
                if !live || std::time::Instant::now() > deadline {
                    break;
                }
                std::thread::sleep(Duration::from_millis(120));
            }
            let _ = sup.start(&id);
        });
        Ok(())
    }

    /// Terminate every live child — called on app quit. Never leak processes.
    pub fn stop_all_blocking(&self, timeout: Duration) {
        let pids: Vec<u32> = {
            let mut map = self.services.lock().unwrap();
            map.values_mut()
                .filter(|m| matches!(m.status, ServiceState::Running | ServiceState::Starting))
                .filter_map(|m| {
                    m.stopping = true;
                    m.pid
                })
                .collect()
        };
        for &pid in &pids {
            terminate_tree(pid, false);
        }
        let deadline = std::time::Instant::now() + timeout;
        while std::time::Instant::now() < deadline && pids.iter().any(|&p| alive(p)) {
            std::thread::sleep(Duration::from_millis(100));
        }
        for &pid in &pids {
            if alive(pid) {
                terminate_tree(pid, true);
            }
        }
    }

    // ---- helpers ---------------------------------------------------------------

    fn transition(&self, id: &str, gen: u64, state: ServiceState, exit_code: Option<i32>, error: Option<(String, String)>) {
        let mut map = self.services.lock().unwrap();
        let Some(m) = map.get_mut(id) else { return };
        if m.generation != gen {
            return;
        }
        m.status = state;
        if !matches!(state, ServiceState::Running | ServiceState::Starting) {
            m.pid = None;
        }
        m.error = error.map(|(code, message)| ServiceError {
            code,
            message,
            time: Local::now().format("Today, %-I:%M %p").to_string(),
        });
        let pid = m.pid;
        drop(map);
        let _ = self.tx.send(SupervisorEvent::Status { id: id.to_string(), status: state, pid, exit_code });
    }

    fn spawn_reader<R: std::io::Read + Send + 'static>(
        &self,
        id: String,
        stream: R,
        ring: Arc<Mutex<VecDeque<LogLine>>>,
        file: Arc<Mutex<Option<std::fs::File>>>,
        last_err: Option<Arc<Mutex<Option<String>>>>,
    ) -> std::thread::JoinHandle<()> {
        let tx = self.tx.clone();
        let cap = self.cfg.ring_capacity;
        std::thread::spawn(move || {
            let reader = BufReader::new(stream);
            for line in reader.lines() {
                let Ok(text) = line else { break };
                let entry = to_log_line(&text);
                if let Some(le) = &last_err {
                    if !text.trim().is_empty() {
                        *le.lock().unwrap() = Some(text.clone());
                    }
                }
                {
                    let mut r = ring.lock().unwrap();
                    if r.len() >= cap {
                        r.pop_front();
                    }
                    r.push_back(entry.clone());
                }
                if let Some(f) = file.lock().unwrap().as_mut() {
                    let _ = writeln!(f, "{} [{}] {}", entry.ts, severity_tag(entry.severity), entry.text);
                }
                let _ = tx.send(SupervisorEvent::Log { id: id.clone(), line: entry });
            }
        })
    }
}

fn severity_tag(s: LogSeverity) -> &'static str {
    match s {
        LogSeverity::Info => "INFO",
        LogSeverity::Ok => "OK",
        LogSeverity::Warn => "WARN",
        LogSeverity::Error => "ERROR",
        LogSeverity::Plain => "-",
    }
}

// ---- process plumbing (cfg-gated) ---------------------------------------------

fn build_command(spec: &ServiceSpec) -> Command {
    #[cfg(unix)]
    let mut cmd = {
        let mut c = Command::new("sh");
        c.arg("-c").arg(&spec.command);
        c
    };
    #[cfg(windows)]
    let mut cmd = {
        let mut c = Command::new("cmd");
        c.args(["/C", &spec.command]);
        c
    };

    cmd.current_dir(&spec.cwd).stdin(Stdio::null()).stdout(Stdio::piped()).stderr(Stdio::piped());

    // inject the project's env files (Q10) on top of the inherited environment
    for name in &spec.env_files {
        let path = spec.cwd.join(name);
        if let Ok(text) = std::fs::read_to_string(&path) {
            for (k, v) in parse_env(&text) {
                cmd.env(k, v);
            }
        }
    }

    #[cfg(unix)]
    {
        use std::os::unix::process::CommandExt;
        cmd.process_group(0); // new group so stop kills the whole tree
    }
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW); // no console flash
    }
    cmd
}

#[cfg(unix)]
fn terminate_tree(pid: u32, force: bool) {
    let sig = if force { libc::SIGKILL } else { libc::SIGTERM };
    unsafe {
        libc::killpg(pid as i32, sig);
    }
}

#[cfg(windows)]
fn terminate_tree(pid: u32, force: bool) {
    let mut c = Command::new("taskkill");
    c.args(["/PID", &pid.to_string(), "/T"]);
    if force {
        c.arg("/F");
    }
    let _ = c.output();
}

#[cfg(unix)]
fn alive(pid: u32) -> bool {
    unsafe { libc::killpg(pid as i32, 0) == 0 }
}

#[cfg(windows)]
fn alive(pid: u32) -> bool {
    Command::new("tasklist")
        .args(["/FI", &format!("PID eq {pid}"), "/NH"])
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).contains(&pid.to_string()))
        .unwrap_or(false)
}
