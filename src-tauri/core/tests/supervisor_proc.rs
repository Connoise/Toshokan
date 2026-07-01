//! Supervisor integration tests — spawn real children and assert the state
//! machine, log capture, and tree-kill. Unix-only (the CI/dev sandbox).
#![cfg(unix)]

use std::path::PathBuf;
use std::sync::mpsc::Receiver;
use std::time::{Duration, Instant};
use toshokan_core::model::{ServiceKind, ServiceState};
use toshokan_core::supervisor::{ServiceSpec, Supervisor, SupervisorConfig, SupervisorEvent};

fn test_config() -> SupervisorConfig {
    SupervisorConfig {
        grace: Duration::from_millis(250),
        stop_timeout: Duration::from_secs(2),
        log_dir: None,
        ring_capacity: 100,
    }
}

fn spec(id: &str, kind: ServiceKind, command: &str) -> ServiceSpec {
    ServiceSpec {
        id: id.into(),
        kind,
        command: command.into(),
        cwd: PathBuf::from("/tmp"),
        env_files: vec![],
        schedule: None,
    }
}

/// Wait until a Status event for `id` reaches `want` (or panic on timeout).
fn wait_for_status(rx: &Receiver<SupervisorEvent>, id: &str, want: ServiceState, timeout: Duration) -> Option<i32> {
    let deadline = Instant::now() + timeout;
    while Instant::now() < deadline {
        match rx.recv_timeout(Duration::from_millis(200)) {
            Ok(SupervisorEvent::Status { id: eid, status, exit_code, .. }) if eid == id && status == want => return exit_code,
            Ok(_) => continue,
            Err(_) => continue,
        }
    }
    panic!("timed out waiting for {id} to reach {want:?}");
}

fn alive(pid: u32) -> bool {
    unsafe { libc::killpg(pid as i32, 0) == 0 }
}

#[test]
fn start_runs_logs_and_stops_cleanly() {
    let (sup, rx) = Supervisor::new(test_config());
    sup.register(spec("web", ServiceKind::Server, "echo hello-from-service; sleep 20"));

    sup.start("web").unwrap();
    wait_for_status(&rx, "web", ServiceState::Running, Duration::from_secs(3));

    let info = sup.info("web").unwrap();
    let pid = info.pid.expect("running service has a pid");
    assert!(alive(pid), "process group should be alive");

    // log captured through the ring buffer
    let deadline = Instant::now() + Duration::from_secs(2);
    loop {
        let log = sup.get_log("web");
        if log.iter().any(|l| l.text.contains("hello-from-service")) {
            break;
        }
        assert!(Instant::now() < deadline, "log line never arrived");
        std::thread::sleep(Duration::from_millis(50));
    }

    sup.stop("web").unwrap();
    wait_for_status(&rx, "web", ServiceState::Stopped, Duration::from_secs(4));
    // the whole group must be gone — no leaked children
    let deadline = Instant::now() + Duration::from_secs(2);
    while alive(pid) && Instant::now() < deadline {
        std::thread::sleep(Duration::from_millis(50));
    }
    assert!(!alive(pid), "process tree should be dead after stop");
    assert_eq!(sup.info("web").unwrap().pid, None);
}

#[test]
fn failing_command_reports_failed_with_stderr() {
    let (sup, rx) = Supervisor::new(test_config());
    sup.register(spec("bad", ServiceKind::Server, "echo boom >&2; exit 3"));

    sup.start("bad").unwrap();
    let code = wait_for_status(&rx, "bad", ServiceState::Failed, Duration::from_secs(3));
    assert_eq!(code, Some(3));

    let info = sup.info("bad").unwrap();
    let err = info.error.expect("failed service carries an error");
    assert_eq!(err.code, "Exited with code 3");
    assert!(err.message.contains("boom"));
}

#[test]
fn job_completion_records_last_run() {
    let (sup, rx) = Supervisor::new(test_config());
    sup.register(spec("job", ServiceKind::Job, "echo job-done"));

    sup.start("job").unwrap();
    wait_for_status(&rx, "job", ServiceState::Stopped, Duration::from_secs(3));

    let info = sup.info("job").unwrap();
    assert!(info.last_run_epoch.is_some(), "successful job records last_run");
    assert!(info.error.is_none());
}

#[test]
fn stop_kills_grandchildren_via_process_group() {
    let (sup, rx) = Supervisor::new(test_config());
    // sh spawns sleep as a child — killing only sh would leak the sleep
    sup.register(spec("tree", ServiceKind::Server, "sleep 30"));

    sup.start("tree").unwrap();
    wait_for_status(&rx, "tree", ServiceState::Running, Duration::from_secs(3));
    let pid = sup.info("tree").unwrap().pid.unwrap();

    sup.stop("tree").unwrap();
    wait_for_status(&rx, "tree", ServiceState::Stopped, Duration::from_secs(4));
    let deadline = Instant::now() + Duration::from_secs(2);
    while alive(pid) && Instant::now() < deadline {
        std::thread::sleep(Duration::from_millis(50));
    }
    assert!(!alive(pid), "no process from the group survives stop");
}

#[test]
fn restart_yields_a_new_pid() {
    let (sup, rx) = Supervisor::new(test_config());
    sup.register(spec("re", ServiceKind::Server, "sleep 20"));

    sup.start("re").unwrap();
    wait_for_status(&rx, "re", ServiceState::Running, Duration::from_secs(3));
    let pid1 = sup.info("re").unwrap().pid.unwrap();

    sup.restart("re").unwrap();
    // stopped, then running again with a fresh pid
    wait_for_status(&rx, "re", ServiceState::Stopped, Duration::from_secs(5));
    wait_for_status(&rx, "re", ServiceState::Running, Duration::from_secs(5));
    let pid2 = sup.info("re").unwrap().pid.unwrap();
    assert_ne!(pid1, pid2);

    sup.stop_all_blocking(Duration::from_secs(3));
    assert!(!alive(pid2), "stop_all leaves nothing behind");
}

#[test]
fn env_file_is_injected() {
    let dir = tempfile::tempdir().unwrap();
    std::fs::write(dir.path().join(".env"), "GREETING=konnichiwa\n").unwrap();
    let (sup, rx) = Supervisor::new(test_config());
    sup.register(ServiceSpec {
        id: "env".into(),
        kind: ServiceKind::Job,
        command: "echo value-is-$GREETING".into(),
        cwd: dir.path().to_path_buf(),
        env_files: vec![".env".into()],
        schedule: None,
    });

    sup.start("env").unwrap();
    wait_for_status(&rx, "env", ServiceState::Stopped, Duration::from_secs(3));
    let log = sup.get_log("env");
    assert!(log.iter().any(|l| l.text.contains("value-is-konnichiwa")), "env var from .env reaches the child");
}
