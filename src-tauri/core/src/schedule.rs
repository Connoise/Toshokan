//! Job scheduling (Q7): cron expression → next-run, and short humanised
//! "in 12m" / "3h ago" labels for the Services table.

use chrono::{Local, TimeZone};
use cron::Schedule;
use std::str::FromStr;

/// Next fire time (epoch seconds) for a cron expression after `now`.
/// Accepts standard 5-field cron; a seconds field is prepended internally.
pub fn next_run_epoch(expr: &str, now_secs: i64) -> Option<i64> {
    let fields = expr.split_whitespace().count();
    let normalized = if fields == 5 { format!("0 {expr}") } else { expr.to_string() };
    let schedule = Schedule::from_str(&normalized).ok()?;
    let now = Local.timestamp_opt(now_secs, 0).single()?;
    schedule.after(&now).next().map(|dt| dt.timestamp())
}

/// "in 12m" / "in 3h" / "in 2d" for a future epoch.
pub fn humanize_in(target_secs: i64, now_secs: i64) -> String {
    let d = (target_secs - now_secs).max(0);
    if d < 60 {
        "in <1m".to_string()
    } else if d < 3600 {
        format!("in {}m", d / 60)
    } else if d < 86400 {
        format!("in {}h", d / 3600)
    } else {
        format!("in {}d", d / 86400)
    }
}

/// "just now" / "12m ago" / "3h ago" / "2d ago" for a past epoch.
pub fn humanize_ago(then_secs: i64, now_secs: i64) -> String {
    let d = (now_secs - then_secs).max(0);
    if d < 60 {
        "just now".to_string()
    } else if d < 3600 {
        format!("{}m ago", d / 60)
    } else if d < 86400 {
        format!("{}h ago", d / 3600)
    } else {
        format!("{}d ago", d / 86400)
    }
}

/// "0m" / "48m" / "1h 22m" / "14d 2h" for a live-service uptime.
pub fn format_uptime(secs: i64) -> String {
    let secs = secs.max(0);
    let (d, h, m) = (secs / 86400, (secs % 86400) / 3600, (secs % 3600) / 60);
    if d > 0 {
        format!("{d}d {h}h")
    } else if h > 0 {
        format!("{h}h {m}m")
    } else {
        format!("{m}m")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{Local, TimeZone, Timelike};

    #[test]
    fn five_field_cron_next_quarter_hour() {
        let now = Local.with_ymd_and_hms(2026, 6, 30, 14, 7, 0).single().unwrap();
        let next = next_run_epoch("*/15 * * * *", now.timestamp()).unwrap();
        let next_dt = Local.timestamp_opt(next, 0).single().unwrap();
        assert_eq!((next_dt.hour(), next_dt.minute()), (14, 15));
    }

    #[test]
    fn hourly_cron() {
        let now = Local.with_ymd_and_hms(2026, 6, 30, 14, 7, 0).single().unwrap();
        let next = next_run_epoch("0 * * * *", now.timestamp()).unwrap();
        let next_dt = Local.timestamp_opt(next, 0).single().unwrap();
        assert_eq!((next_dt.hour(), next_dt.minute()), (15, 0));
    }

    #[test]
    fn invalid_cron_is_none() {
        assert!(next_run_epoch("not a cron", 0).is_none());
    }

    #[test]
    fn humanize_labels() {
        assert_eq!(humanize_in(1000 + 720, 1000), "in 12m");
        assert_eq!(humanize_in(1000 + 7200, 1000), "in 2h");
        assert_eq!(humanize_ago(1000, 1000 + 180), "3m ago");
        assert_eq!(format_uptime(48 * 60), "48m");
        assert_eq!(format_uptime(3600 + 22 * 60), "1h 22m");
        assert_eq!(format_uptime(14 * 86400 + 2 * 3600), "14d 2h");
    }
}
