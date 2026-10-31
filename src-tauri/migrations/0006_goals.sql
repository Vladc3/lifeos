-- Plan F4, E4. Only SQL that SQLite 3.46 (bundled in sqlx) supports.
-- No CHECK on a future deadline: an overdue goal must stay editable (R4). No UNIQUE
-- on priority: reordering runs through equal values. CASE, because a CHECK that
-- evaluates to NULL passes.
CREATE TABLE goals (
  id INTEGER PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('saving', 'limit', 'no_spend')),
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  target_amount INTEGER CHECK (target_amount > 0),
  target_days INTEGER CHECK (target_days BETWEEN 1 AND 31),
  category_id INTEGER REFERENCES categories (id),
  deadline TEXT CHECK (date(deadline) IS deadline),
  priority INTEGER NOT NULL,
  paused_at TEXT,
  achieved_at TEXT,
  archived_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (
    CASE type
      WHEN 'saving' THEN target_amount IS NOT NULL AND deadline IS NOT NULL
        AND category_id IS NULL AND target_days IS NULL
      WHEN 'limit' THEN target_amount IS NOT NULL AND category_id IS NOT NULL
        AND deadline IS NULL AND target_days IS NULL
      WHEN 'no_spend' THEN target_days IS NOT NULL AND target_amount IS NULL
        AND category_id IS NULL AND deadline IS NULL
    END
  )
);

-- A deposit is not an expense (FIN-07), so it is not a transaction.
CREATE TABLE goal_deposits (
  id INTEGER PRIMARY KEY,
  goal_id INTEGER NOT NULL REFERENCES goals (id),
  date TEXT NOT NULL CHECK (date(date) IS date),
  amount INTEGER NOT NULL CHECK (amount > 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
