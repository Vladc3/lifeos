/// <reference types="node" />
// PUB-04: `npm run demo` fills the DEV database with made-up data for screenshots.
// Never touches real data: the path comes from the dev identifier only (PUB-03).
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import {
  DEMO_BUDGET,
  DEMO_LIMITS,
  demoHabits,
  demoRecurring,
  demoTransactions,
  devDbPath,
} from "../src/lib/demo.ts";

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const root = new URL("../", import.meta.url);
// tauri.conf.json is the dev config; the release one is never read here.
const { identifier } = JSON.parse(
  readFileSync(new URL("src-tauri/tauri.conf.json", root), "utf8"),
) as { identifier: string };
const path = devDbPath(process.platform, process.env, identifier);

if (!existsSync(path))
  fail(`${path} neexistuje. Nejdřív jednou spusť npm run tauri dev.`);

// Only the app runs migrations (sqlx records them), so the DB must be up to date.
const latest = Math.max(
  ...readdirSync(new URL("src-tauri/migrations/", root))
    .filter((f) => f.endsWith(".sql"))
    .map((f) => Number(f.split("_")[0])),
);
const db = new DatabaseSync(path);
const applied = db
  .prepare("SELECT max(version) AS v FROM _sqlx_migrations WHERE success = 1")
  .get() as { v: number | null };
if (applied.v !== latest)
  fail(
    `DB má migrace do verze ${applied.v}, kód do ${latest}. Spusť npm run tauri dev a pak znovu npm run demo.`,
  );

const now = new Date();
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
const categories = db
  .prepare(
    "SELECT id, name, kind FROM categories WHERE archived_at IS NULL ORDER BY id",
  )
  .all() as { id: number; name: string; kind: "expense" | "income" }[];
const transactions = demoTransactions(today, categories);
const recurring = demoRecurring(today, categories);
const habits = demoHabits(today);

// One connection, so a plain transaction is safe here (unlike plugin-sql's pool).
db.exec("BEGIN");
try {
  // Plan F4, E13: runs too, otherwise the months would never be generated again.
  db.exec("DELETE FROM recurring_runs");
  db.exec("DELETE FROM transactions");
  db.exec("DELETE FROM recurring");
  db.exec("UPDATE categories SET monthly_budget = 0");
  const limit = db.prepare(
    "UPDATE categories SET monthly_budget = ? WHERE name = ? AND kind = 'expense'",
  );
  for (const [name, halere] of Object.entries(DEMO_LIMITS))
    limit.run(halere, name);
  db.prepare(
    "INSERT INTO settings (key, value) VALUES ('monthly_budget', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  ).run(String(DEMO_BUDGET));
  const insert = db.prepare(
    "INSERT INTO transactions (date, amount, category_id, note) VALUES (?, ?, ?, ?)",
  );
  for (const t of transactions)
    insert.run(t.date, t.amount, t.category_id, t.note);
  const addRecurring = db.prepare(
    "INSERT INTO recurring (name, amount, category_id, day_of_month, first_month) VALUES (?, ?, ?, ?, ?)",
  );
  for (const r of recurring)
    addRecurring.run(
      r.name,
      r.amount,
      r.category_id,
      r.day_of_month,
      r.first_month,
    );
  // PUB-04 habits (plan F3, E10): children first because of the foreign keys.
  db.exec("DELETE FROM habit_logs");
  db.exec("DELETE FROM habit_pauses");
  db.exec("DELETE FROM habits");
  const addHabit = db.prepare(
    `INSERT INTO habits (name, icon, identity, type, target_value, unit, frequency, days_mask,
       weekly_target, anchor, min_version, min_value, phase, start_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const addLog = db.prepare(
    "INSERT INTO habit_logs (habit_id, date, status, value) VALUES (?, ?, ?, ?)",
  );
  for (const { habit: h, logs } of habits) {
    const { lastInsertRowid } = addHabit.run(
      h.name,
      h.icon,
      h.identity,
      h.type,
      h.target_value,
      h.unit,
      h.frequency,
      h.days_mask,
      h.weekly_target,
      h.anchor,
      h.min_version,
      h.min_value,
      h.phase,
      h.start_date,
    );
    for (const log of logs)
      addLog.run(lastInsertRowid, log.date, log.status, log.value);
  }
  db.exec("COMMIT");
} catch (error) {
  db.exec("ROLLBACK");
  fail(`Demo data se nepodařilo zapsat (běží app?): ${String(error)}`);
}

console.log(
  `Vloženo ${transactions.length} smyšlených transakcí do ${path}. Restartuj app.`,
);
