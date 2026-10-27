-- Plan F3, E1 (PRD v0.7 kap. 7). Only SQL that SQLite 3.46 (bundled in sqlx) supports.
-- A CHECK lets NULL pass, so nullable columns are guarded with IS / coalesce.
CREATE TABLE habits (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 40),
  icon TEXT NOT NULL,
  identity TEXT,
  type TEXT NOT NULL CHECK (type IN ('check', 'count', 'duration')),
  target_value INTEGER,
  unit TEXT,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'days', 'weekly_count')),
  days_mask INTEGER,
  weekly_target INTEGER,
  anchor TEXT,
  min_version TEXT,
  min_value INTEGER,
  phase TEXT NOT NULL DEFAULT 'building' CHECK (phase IN ('building', 'established')),
  -- Local day the habit starts (CALC-01, CALC-05); created_at is UTC.
  start_date TEXT NOT NULL CHECK (date(start_date) IS start_date),
  archived_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  -- HAB-01: a count/duration habit needs a target > 0, a yes/no habit has none.
  CHECK (CASE type WHEN 'check' THEN target_value IS NULL ELSE coalesce(target_value, 0) > 0 END),
  -- HAB-01: 0 < min_value < target_value, only for count/duration.
  CHECK (min_value IS NULL OR (type <> 'check' AND min_value > 0 AND min_value < target_value)),
  -- CALC-01: days_mask only for 'days' (bit 0 = Monday), weekly_target only for 'weekly_count'.
  CHECK (CASE frequency WHEN 'days' THEN coalesce(days_mask, 0) BETWEEN 1 AND 127 ELSE days_mask IS NULL END),
  CHECK (CASE frequency WHEN 'weekly_count' THEN coalesce(weekly_target, 0) BETWEEN 1 AND 7 ELSE weekly_target IS NULL END)
);

CREATE TABLE habit_pauses (
  id INTEGER PRIMARY KEY,
  habit_id INTEGER NOT NULL REFERENCES habits (id),
  start_date TEXT NOT NULL CHECK (date(start_date) IS start_date),
  end_date TEXT CHECK (end_date IS NULL OR (date(end_date) IS end_date AND end_date >= start_date)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- At most one open pause per habit.
CREATE UNIQUE INDEX habit_pauses_open ON habit_pauses (habit_id) WHERE end_date IS NULL;

CREATE TABLE habit_logs (
  id INTEGER PRIMARY KEY,
  habit_id INTEGER NOT NULL REFERENCES habits (id),
  date TEXT NOT NULL CHECK (date(date) IS date),
  value INTEGER CHECK (value IS NULL OR value >= 0),
  status TEXT NOT NULL CHECK (status IN ('done', 'minimum', 'missed', 'rest')),
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (habit_id, date)
);
