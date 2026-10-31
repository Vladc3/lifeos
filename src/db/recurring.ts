import type { QueryResult } from "@tauri-apps/plugin-sql";
import { dueRuns, firstRunMonth, type DueRun } from "../lib/recurring";
import type { Db } from "./types";

export interface RecurringInput {
  name: string;
  amount: number; // haléře, > 0
  category_id: number;
  day_of_month: number; // 1–31
}

export interface Recurring extends RecurringInput {
  id: number;
  first_month: string; // YYYY-MM, set once (plan F4, D1)
  archived_at: string | null;
}

const COLUMNS =
  "id, name, amount, category_id, day_of_month, first_month, archived_at";

/** FIN-05: active payments first, by their day in the month. */
export function listRecurring(db: Db): Promise<Recurring[]> {
  return db.select<Recurring[]>(
    `SELECT ${COLUMNS} FROM recurring ORDER BY archived_at IS NOT NULL, day_of_month, id`,
  );
}

export async function createRecurring(
  db: Db,
  input: RecurringInput,
  today: string,
): Promise<void> {
  await db.execute(
    "INSERT INTO recurring (name, amount, category_id, day_of_month, first_month) VALUES ($1, $2, $3, $4, $5)",
    [
      input.name,
      input.amount,
      input.category_id,
      input.day_of_month,
      firstRunMonth(input.day_of_month, today),
    ],
  );
}

/**
 * Plan F4, E1: one statement, so the trigger writes the run atomically (Q6).
 * NOT EXISTS is the real guard, dueRuns only saves work. Never OR IGNORE.
 */
export function insertRun(
  db: Db,
  recurring: Recurring,
  run: DueRun,
): Promise<QueryResult> {
  return db.execute(
    `INSERT INTO transactions (date, amount, category_id, note, recurring_id)
     SELECT $1, $2, $3, $4, $5
     WHERE NOT EXISTS (
       SELECT 1 FROM recurring_runs WHERE recurring_id = $5 AND month = $6
     )`,
    [
      run.date,
      recurring.amount,
      recurring.category_id,
      recurring.name,
      recurring.id,
      run.month,
    ],
  );
}

/** CALC-11: creates the missing payments up to today. Safe to run any time. */
export async function generateRecurring(db: Db, today: string): Promise<void> {
  const payments = await db.select<Recurring[]>(
    `SELECT ${COLUMNS} FROM recurring WHERE archived_at IS NULL`,
  );
  const runs = await db.select<{ recurring_id: number; month: string }[]>(
    "SELECT recurring_id, month FROM recurring_runs",
  );
  for (const payment of payments) {
    const done = runs
      .filter((run) => run.recurring_id === payment.id)
      .map((run) => run.month);
    for (const run of dueRuns(payment, done, today))
      await insertRun(db, payment, run);
  }
}

/** E3: changes only future runs. Months missed so far keep the old values (E2). */
export async function updateRecurring(
  db: Db,
  id: number,
  input: RecurringInput,
  today: string,
): Promise<void> {
  await generateRecurring(db, today);
  await db.execute(
    "UPDATE recurring SET name = $1, amount = $2, category_id = $3, day_of_month = $4 WHERE id = $5",
    [input.name, input.amount, input.category_id, input.day_of_month, id],
  );
}

/** E2: months missed while the app was closed are generated first. */
export async function archiveRecurring(
  db: Db,
  id: number,
  today: string,
): Promise<void> {
  await generateRecurring(db, today);
  await db.execute("UPDATE recurring SET archived_at = $1 WHERE id = $2", [
    today,
    id,
  ]);
}
