//! Local-only clipboard history backed by SQLite + FTS5.

use std::path::Path;

use anyhow::{Context, Result};
use chrono::Utc;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use sniffer::Diagnosis;

const SCHEMA: &str = include_str!("../migrations/001_init.sql");

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Clip {
    pub id: String,
    pub content: String,
    pub kind: String,
    pub created_at: i64,
    pub pinned: bool,
    pub diagnosis: Diagnosis,
}

pub struct Vault {
    conn: Connection,
}

impl Vault {
    pub fn open(path: impl AsRef<Path>) -> Result<Self> {
        let conn = Connection::open(path).context("cannot open vault.db")?;
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;")?;
        conn.execute_batch(SCHEMA).context("cannot init schema")?;
        Ok(Self { conn })
    }

    pub fn insert(&self, content: &str, diagnosis: Diagnosis) -> Result<Clip> {
        let seq: i64 = self
            .conn
            .query_row("SELECT COALESCE(MAX(seq), 0) + 1 FROM clips", [], |r| r.get(0))?;
        let id = format!("c{}", seq);
        let now = Utc::now().timestamp_millis();
        let diag_json = serde_json::to_string(&diagnosis)?;
        self.conn.execute(
            "INSERT INTO clips(id, seq, content, kind, created_at, pinned, diagnosis)
             VALUES (?1, ?2, ?3, ?4, ?5, 0, ?6)",
            params![id, seq, content, diagnosis.kind.clone(), now, diag_json],
        )?;
        Ok(Clip {
            id,
            content: content.to_string(),
            kind: diagnosis.kind.clone(),
            created_at: now,
            pinned: false,
            diagnosis,
        })
    }

    pub fn list(&self, limit: i64) -> Result<Vec<Clip>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, content, kind, created_at, pinned, diagnosis
             FROM clips ORDER BY pinned DESC, created_at DESC LIMIT ?1",
        )?;
        let rows = stmt.query_map([limit], row_to_clip)?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(Into::into)
    }

    pub fn search(&self, query: &str, limit: i64) -> Result<Vec<Clip>> {
        let mut stmt = self.conn.prepare(
            "SELECT c.id, c.content, c.kind, c.created_at, c.pinned, c.diagnosis
             FROM clips_fts f JOIN clips c ON c.seq = f.rowid
             WHERE clips_fts MATCH ?1 ORDER BY c.created_at DESC LIMIT ?2",
        )?;
        // Quote as an FTS5 phrase so punctuation in user input is not parsed as
        // column filters or boolean operators.
        let phrase = format!("\"{}\"", query.replace('"', "\"\""));
        let rows = stmt.query_map(params![phrase, limit], row_to_clip)?;
        rows.collect::<rusqlite::Result<Vec<_>>>().map_err(Into::into)
    }

    pub fn set_pin(&self, id: &str, pinned: bool) -> Result<()> {
        self.conn.execute(
            "UPDATE clips SET pinned = ?1 WHERE id = ?2",
            params![i64::from(pinned), id],
        )?;
        Ok(())
    }

    pub fn delete(&self, id: &str) -> Result<()> {
        self.conn.execute("DELETE FROM clips WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn stats(&self) -> Result<(i64, i64)> {
        let total: i64 = self
            .conn
            .query_row("SELECT COUNT(*) FROM clips", [], |r| r.get(0))?;
        let pinned: i64 = self
            .conn
            .query_row("SELECT COUNT(*) FROM clips WHERE pinned = 1", [], |r| r.get(0))?;
        Ok((total, pinned))
    }

    /// Delete expired clips (never pinned) and enforce a max count of unpinned clips.
    pub fn prune(&self, retention_days: i64, max_items: i64) -> Result<u64> {
        let cutoff = Utc::now().timestamp_millis() - retention_days * 86_400_000;
        let expired = self.conn.execute(
            "DELETE FROM clips WHERE pinned = 0 AND created_at < ?1",
            params![cutoff],
        )?;
        let excess = self.conn.execute(
            "DELETE FROM clips WHERE pinned = 0 AND id NOT IN
             (SELECT id FROM clips WHERE pinned = 0 ORDER BY created_at DESC LIMIT ?1)",
            params![max_items],
        )?;
        Ok((expired + excess) as u64)
    }
}

fn row_to_clip(row: &rusqlite::Row<'_>) -> rusqlite::Result<Clip> {
    let id: String = row.get(0)?;
    let content: String = row.get(1)?;
    let kind: String = row.get(2)?;
    let created_at: i64 = row.get(3)?;
    let pinned: i64 = row.get(4)?;
    let diag_raw: String = row.get(5)?;
    let diagnosis = serde_json::from_str::<Diagnosis>(&diag_raw).unwrap_or(Diagnosis {
        kind: kind.clone(),
        findings: Vec::new(),
        elapsed_ms: 0,
    });
    Ok(Clip {
        id,
        content,
        kind,
        created_at,
        pinned: pinned != 0,
        diagnosis,
    })
}
