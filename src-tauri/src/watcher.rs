//! Live workspace watcher (Q16): shallow (non-recursive) + debounced so a burst
//! of filesystem events coalesces into a single rescan, keeping RAM/CPU low.

use crate::state::{run_scan, AppState};
use crate::util::expand;
use notify::{EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::sync::mpsc::{channel, RecvTimeoutError};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Manager};

const DEBOUNCE: Duration = Duration::from_millis(600);

pub fn spawn(app: AppHandle) {
    std::thread::spawn(move || {
        let (tx, rx) = channel();
        let mut watcher = match RecommendedWatcher::new(move |res| { let _ = tx.send(res); }, notify::Config::default()) {
            Ok(w) => w,
            Err(_) => return,
        };

        // Watch each configured root one level deep (non-recursive).
        {
            let state = app.state::<AppState>();
            let cfg = state.config.lock().unwrap().clone();
            for d in &cfg.directories {
                let _ = watcher.watch(&expand(&d.path), RecursiveMode::NonRecursive);
            }
        }

        let mut pending = false;
        let mut last = Instant::now();
        loop {
            match rx.recv_timeout(Duration::from_millis(200)) {
                Ok(Ok(event)) => {
                    if matches!(event.kind, EventKind::Create(_) | EventKind::Remove(_) | EventKind::Modify(_)) {
                        pending = true;
                        last = Instant::now();
                    }
                }
                Ok(Err(_)) => {}
                Err(RecvTimeoutError::Timeout) => {
                    if pending && last.elapsed() >= DEBOUNCE {
                        pending = false;
                        run_scan(&app, None);
                    }
                }
                Err(RecvTimeoutError::Disconnected) => break,
            }
        }
    });
}
