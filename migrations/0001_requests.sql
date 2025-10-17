CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  ts INTEGER NOT NULL,
  route TEXT NOT NULL,
  status INTEGER NOT NULL,
  ms INTEGER NOT NULL,
  ip_sha256 TEXT,
  ua_sha256 TEXT,
  api_key_id TEXT,
  err TEXT
);
CREATE INDEX IF NOT EXISTS idx_requests_ts ON requests(ts);
CREATE INDEX IF NOT EXISTS idx_requests_route ON requests(route);