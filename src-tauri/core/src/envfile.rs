//! Minimal .env parser (Q10): KEY=VALUE lines, `#` comments, optional `export `
//! prefix, single/double quotes stripped. Values are injected into service
//! children at launch — never stored in Toshokan's own config.

pub fn parse_env(text: &str) -> Vec<(String, String)> {
    let mut out = Vec::new();
    for raw in text.lines() {
        let line = raw.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        let line = line.strip_prefix("export ").unwrap_or(line);
        let Some((key, value)) = line.split_once('=') else {
            continue;
        };
        let key = key.trim();
        if key.is_empty() || !key.chars().all(|c| c.is_ascii_alphanumeric() || c == '_') {
            continue;
        }
        let mut value = value.trim();
        // strip one matching pair of quotes
        if value.len() >= 2 {
            let b = value.as_bytes();
            if (b[0] == b'"' && b[b.len() - 1] == b'"') || (b[0] == b'\'' && b[b.len() - 1] == b'\'') {
                value = &value[1..value.len() - 1];
            }
        }
        out.push((key.to_string(), value.to_string()));
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_basic_pairs() {
        let vars = parse_env("A=1\nB = two \n# comment\nexport C=\"three four\"\nD='5'\n\nBAD LINE\n=novalue\n");
        assert_eq!(
            vars,
            vec![
                ("A".into(), "1".into()),
                ("B".into(), "two".into()),
                ("C".into(), "three four".into()),
                ("D".into(), "5".into()),
            ]
        );
    }

    #[test]
    fn rejects_invalid_keys() {
        assert!(parse_env("SOME-KEY=x\n$WEIRD=y\n").is_empty());
    }
}
