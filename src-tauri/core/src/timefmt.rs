//! Humanise timestamps into the strings the UI uses ("Today, 9:15 AM", "2d ago",
//! "Jun 6"). `now` is injectable so the logic is deterministically testable.

use chrono::{DateTime, Local, TimeZone};
use std::time::SystemTime;

/// Humanise a unix-epoch-seconds timestamp relative to `now` (also epoch seconds).
pub fn humanize_epoch(secs: i64, now_secs: i64) -> String {
    let dt = match Local.timestamp_opt(secs, 0).single() {
        Some(d) => d,
        None => return String::new(),
    };
    let now = match Local.timestamp_opt(now_secs, 0).single() {
        Some(d) => d,
        None => return String::new(),
    };
    humanize_dt(dt, now)
}

/// Humanise a `SystemTime` (e.g. a file mtime) relative to wall-clock now.
pub fn humanize_systemtime(t: SystemTime) -> String {
    let secs = t
        .duration_since(SystemTime::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    humanize_epoch(secs, now_epoch())
}

pub fn now_epoch() -> i64 {
    SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

fn humanize_dt(dt: DateTime<Local>, now: DateTime<Local>) -> String {
    let time_str = dt.format("%-I:%M %p").to_string(); // e.g. "9:15 AM"
    let days = day_diff(dt, now);
    match days {
        0 => format!("Today, {time_str}"),
        1 => format!("Yesterday, {time_str}"),
        2..=6 => format!("{days}d ago"),
        _ => dt.format("%b %-d").to_string(), // e.g. "Jun 6"
    }
}

/// Whole-calendar-day difference (now - dt), floored at 0 for future stamps.
fn day_diff(dt: DateTime<Local>, now: DateTime<Local>) -> i64 {
    let d0 = dt.date_naive();
    let d1 = now.date_naive();
    (d1 - d0).num_days().max(0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Duration;

    fn now() -> DateTime<Local> {
        Local.with_ymd_and_hms(2026, 6, 30, 14, 0, 0).single().unwrap()
    }

    #[test]
    fn today_shows_time() {
        let dt = Local.with_ymd_and_hms(2026, 6, 30, 9, 15, 0).single().unwrap();
        assert_eq!(humanize_dt(dt, now()), "Today, 9:15 AM");
    }

    #[test]
    fn yesterday_shows_time() {
        let dt = Local.with_ymd_and_hms(2026, 6, 29, 16, 31, 0).single().unwrap();
        assert_eq!(humanize_dt(dt, now()), "Yesterday, 4:31 PM");
    }

    #[test]
    fn within_week_shows_days_ago() {
        let dt = now() - Duration::days(3);
        assert_eq!(humanize_dt(dt, now()), "3d ago");
    }

    #[test]
    fn older_shows_month_day() {
        let dt = Local.with_ymd_and_hms(2026, 6, 6, 23, 2, 0).single().unwrap();
        assert_eq!(humanize_dt(dt, now()), "Jun 6");
    }

    #[test]
    fn future_is_today() {
        let dt = now() + Duration::hours(2);
        assert!(humanize_dt(dt, now()).starts_with("Today"));
    }
}
