CREATE TABLE IF NOT EXISTS mandalas (
  id TEXT PRIMARY KEY,
  ts INTEGER NOT NULL,
  r2_key TEXT NOT NULL,
  meta_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_mandalas_ts ON mandalas(ts);