use std::time::{SystemTime, UNIX_EPOCH};

use sniffer::Diagnosis;
use vault::Vault;

#[test]
fn fts5_search_finds_inserted_clip() {
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("clock")
        .as_nanos();
    let dir = std::env::temp_dir().join(format!("fde-clip-test-{nonce}"));
    std::fs::create_dir_all(&dir).expect("create temp dir");
    let db = dir.join("vault.db");

    {
        let store = Vault::open(&db).expect("open vault");
        let diagnosis = Diagnosis {
            kind: "text".into(),
            findings: Vec::new(),
            elapsed_ms: 0,
        };
        store
            .insert("alpha unique-needle beta", diagnosis)
            .expect("insert clip");
        let hits = store.search("unique-needle", 10).expect("fts search");
        assert_eq!(hits.len(), 1);
        assert_eq!(hits[0].content, "alpha unique-needle beta");
    }

    std::fs::remove_dir_all(&dir).expect("cleanup temp dir");
}
