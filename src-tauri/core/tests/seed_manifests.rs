//! The bundled overlay manifests (PLAN §8) must always parse.

use toshokan_core::manifest;

const SEEDS: &[(&str, &str)] = &[
    ("idolmancer", include_str!("../../manifests/idolmancer.yml")),
    ("jagaimo", include_str!("../../manifests/jagaimo.yml")),
    ("sando", include_str!("../../manifests/sando.yml")),
    ("plastiglom", include_str!("../../manifests/plastiglom.yml")),
    ("frogbudget", include_str!("../../manifests/frogbudget.yml")),
    ("inventorois", include_str!("../../manifests/inventorois.yml")),
    ("kanimiso", include_str!("../../manifests/kanimiso.yml")),
];

#[test]
fn all_seed_manifests_parse() {
    for (id, text) in SEEDS {
        let m = manifest::parse(text).unwrap_or_else(|e| panic!("seed {id} failed to parse: {e}"));
        assert!(!m.services.is_empty(), "seed {id} defines at least one service");
        for s in &m.services {
            assert!(!s.command.trim().is_empty(), "seed {id}: service {} has a command", s.name);
            if s.kind == "job" {
                let expr = s.schedule.as_deref().unwrap_or_else(|| panic!("seed {id}: job {} needs a schedule", s.name));
                assert!(
                    toshokan_core::schedule::next_run_epoch(expr, 1_780_000_000).is_some(),
                    "seed {id}: job {} has a valid cron ({expr})",
                    s.name
                );
            }
        }
    }
}
