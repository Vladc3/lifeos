-- Plan F2, E2/E3. Only SQL that SQLite 3.46 (bundled in sqlx) supports.
CREATE TABLE categories (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('expense', 'income')),
  monthly_budget INTEGER NOT NULL DEFAULT 0 CHECK (monthly_budget >= 0),
  archived_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (kind = 'expense' OR monthly_budget = 0)
);

-- An archived category frees its name.
CREATE UNIQUE INDEX categories_active_name ON categories (kind, name)
  WHERE archived_at IS NULL;

-- The type (income / expense) is not stored: it is the kind of the category.
-- IS, not =: date() returns NULL for "26.10.2026" and a CHECK lets NULL pass.
CREATE TABLE transactions (
  id INTEGER PRIMARY KEY,
  date TEXT NOT NULL CHECK (date(date) IS date),
  amount INTEGER NOT NULL CHECK (amount > 0),
  category_id INTEGER NOT NULL REFERENCES categories (id),
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
