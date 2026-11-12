-- Plan F4, E1. Only SQL that SQLite 3.46 (bundled in sqlx) supports.
-- Payments are only archived, so plain REFERENCES: SET NULL here would turn past
-- recurring payments into ordinary spending (CALC-10).
CREATE TABLE recurring (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  category_id INTEGER NOT NULL REFERENCES categories (id),
  day_of_month INTEGER NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
  -- First month with a payment, fixed at creation (D1). A later change of the day
  -- must not reopen an older month.
  first_month TEXT NOT NULL
    CHECK (first_month GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'),
  archived_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

ALTER TABLE transactions ADD COLUMN recurring_id INTEGER REFERENCES recurring (id);

-- A deleted transaction keeps its run, so the month is not generated again.
CREATE TABLE recurring_runs (
  recurring_id INTEGER NOT NULL REFERENCES recurring (id),
  month TEXT NOT NULL,
  transaction_id INTEGER REFERENCES transactions (id) ON DELETE SET NULL,
  UNIQUE (recurring_id, month)
);

-- The run is written by the same statement as the transaction (Q6). Never insert
-- with OR IGNORE: its conflict policy overrides this trigger's and allows duplicates.
CREATE TRIGGER transactions_recurring_run
AFTER INSERT ON transactions
WHEN NEW.recurring_id IS NOT NULL
BEGIN
  INSERT INTO recurring_runs (recurring_id, month, transaction_id)
  VALUES (NEW.recurring_id, substr(NEW.date, 1, 7), NEW.id);
END;
