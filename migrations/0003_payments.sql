CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  ts INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  email_hash TEXT
);
CREATE INDEX IF NOT EXISTS idx_payments_ts ON payments(ts);