-- Plan F4, E5. Only SQL that SQLite 3.46 (bundled in sqlx) supports.
-- No trigger on the value: value = base_value + deposits with id > base_deposit_id.
-- Overwriting the value sets both columns, so deleting an older deposit changes nothing.
CREATE TABLE investments (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  base_value INTEGER NOT NULL CHECK (base_value >= 0),
  base_deposit_id INTEGER NOT NULL DEFAULT 0,
  monthly_deposit INTEGER NOT NULL CHECK (monthly_deposit >= 0),
  archived_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- AUTOINCREMENT: an id must never come back, or a new deposit could fall under
-- base_deposit_id. A deposit is not an expense, so it is not a transaction.
CREATE TABLE investment_deposits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  investment_id INTEGER NOT NULL REFERENCES investments (id),
  date TEXT NOT NULL CHECK (date(date) IS date),
  amount INTEGER NOT NULL CHECK (amount > 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
