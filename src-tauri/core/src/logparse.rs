//! C6 — log severity parsing. Child stdout/stderr lines are classified into
//! structured LogLine{severity}; the UI maps severity → console color.
//! Heuristics cover the common dev-server dialects (Vite, uvicorn, npm, cargo).

use crate::model::{LogLine, LogSeverity};
use chrono::Local;

pub fn parse_severity(line: &str) -> LogSeverity {
    let l = line.to_lowercase();
    if l.contains("error") || l.contains("err!") || l.contains("fatal") || l.contains("exception") || l.contains("failed") || l.contains("panicked") {
        return LogSeverity::Error;
    }
    if l.contains("warn") || l.contains("deprecated") {
        return LogSeverity::Warn;
    }
    if l.contains("ready in") || l.contains('✓') || l.contains("built in") || l.contains("startup complete") || l.contains(" 200") || l.contains("compiled") {
        return LogSeverity::Ok;
    }
    if l.starts_with("info") || l.contains(" info ") || l.starts_with("[info") {
        return LogSeverity::Info;
    }
    LogSeverity::Plain
}

/// Build a timestamped LogLine from a raw output line.
pub fn to_log_line(text: &str) -> LogLine {
    LogLine {
        ts: Local::now().format("%H:%M:%S").to_string(),
        severity: parse_severity(text),
        text: text.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn classifies_dev_server_dialects() {
        assert_eq!(parse_severity("INFO  Uvicorn running on http://127.0.0.1:8001"), LogSeverity::Info);
        assert_eq!(parse_severity("npm ERR! Lifecycle script `dev` failed"), LogSeverity::Error);
        assert_eq!(parse_severity("Error: Port 3000 is already in use"), LogSeverity::Error);
        assert_eq!(parse_severity("WARN deprecated package"), LogSeverity::Warn);
        assert_eq!(parse_severity("vite v5.2.3 ready in 384 ms"), LogSeverity::Ok);
        assert_eq!(parse_severity("✓ built in 176ms"), LogSeverity::Ok);
        assert_eq!(parse_severity("GET /stats 200 OK"), LogSeverity::Ok);
        assert_eq!(parse_severity("poll: 0 reminders due"), LogSeverity::Plain);
    }
}
