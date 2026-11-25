CREATE TABLE IF NOT EXISTS clips (
    id          TEXT PRIMARY KEY,
    seq         INTEGER NOT NULL UNIQUE,
    content     TEXT NOT NULL,
    kind        TEXT NOT NULL,
    created_at  INTEGER NOT NULL,
    pinned      INTEGER NOT NULL DEFAULT 0,
    diagnosis   TEXT NOT NULL
);

CREATE VIRTUAL TABLE IF NOT EXISTS clips_fts
    USING fts5(content, content='clips', content_rowid='seq');

CREATE TRIGGER IF NOT EXISTS clips_ai AFTER INSERT ON clips BEGIN
    INSERT INTO clips_fts(rowid, content) VALUES (new.seq, new.content);
END;

CREATE TRIGGER IF NOT EXISTS clips_ad AFTER DELETE ON clips BEGIN
    INSERT INTO clips_fts(clips_fts, rowid, content) VALUES ('delete', old.seq, old.content);
END;

CREATE TRIGGER IF NOT EXISTS clips_au AFTER UPDATE OF content ON clips BEGIN
    INSERT INTO clips_fts(clips_fts, rowid, content) VALUES ('delete', old.seq, old.content);
    INSERT INTO clips_fts(rowid, content) VALUES (new.seq, new.content);
END;

CREATE INDEX IF NOT EXISTS clips_created_at ON clips(created_at DESC);
