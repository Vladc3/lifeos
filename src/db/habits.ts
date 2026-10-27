import type { Frequency, HabitLog, LogStatus, Pause } from "../lib/habits";
import type { Db } from "./types";

export type HabitType = "check" | "count" | "duration";

export interface HabitInput {
  name: string;
  icon: string;
  identity: string | null;
  type: HabitType;
  target_value: number | null;
  unit: string | null;
  frequency: Frequency;
  days_mask: number | null;
  weekly_target: number | null;
  anchor: string | null;
  min_version: string | null;
  min_value: number | null;
}

export interface Habit extends HabitInput {
  id: number;
  phase: "building" | "established";
  start_date: string;
  archived_at: string | null;
}

export type StoredLog = HabitLog & { habit_id: number };
export type StoredPause = Pause & { habit_id: number };

const COLUMNS =
  "name, icon, identity, type, target_value, unit, frequency, days_mask, weekly_target, anchor, min_version, min_value";

// CALC-06: active (not archived, not paused) habits in the building phase.
const BUILDING_COUNT = `(SELECT count(*) FROM habits h
  WHERE h.phase = 'building' AND h.archived_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM habit_pauses p WHERE p.habit_id = h.id AND p.end_date IS NULL))`;

export function listHabits(db: Db): Promise<Habit[]> {
  return db.select<Habit[]>(
    `SELECT id, ${COLUMNS}, phase, start_date, archived_at FROM habits ORDER BY id`,
  );
}

/**
 * HAB-01. One conditional INSERT, so the limit of 3 building habits (CALC-06)
 * holds even with plugin-sql's pool, where BEGIN/COMMIT is not safe (PRD Q6).
 */
export async function createHabit(
  db: Db,
  input: HabitInput,
  today: string,
): Promise<number | "limit"> {
  const result = await db.execute(
    `INSERT INTO habits (${COLUMNS}, start_date)
     SELECT $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
     WHERE ${BUILDING_COUNT} < 3`,
    [
      input.name,
      input.icon,
      input.identity,
      input.type,
      input.target_value,
      input.unit,
      input.frequency,
      input.days_mask,
      input.weekly_target,
      input.anchor,
      input.min_version,
      input.min_value,
      today,
    ],
  );
  return result.rowsAffected === 0 ? "limit" : (result.lastInsertId as number);
}

/** All logs: a "never twice" streak can reach back to the habit's start. */
export function listLogs(db: Db): Promise<StoredLog[]> {
  return db.select<StoredLog[]>(
    "SELECT habit_id, date, status, value FROM habit_logs ORDER BY habit_id, date",
  );
}

export function listPauses(db: Db): Promise<StoredPause[]> {
  return db.select<StoredPause[]>(
    "SELECT habit_id, start_date, end_date FROM habit_pauses ORDER BY habit_id, start_date",
  );
}

/**
 * HAB-03: write, overwrite or (status null) delete the log of a day.
 * Rest only for today and later (CALC-02): a miss can't be excused afterwards.
 */
export async function setLog(
  db: Db,
  habitId: number,
  date: string,
  status: LogStatus | null,
  value: number | null,
  today: string,
): Promise<"ok" | "past_rest"> {
  if (status === "rest" && date < today) return "past_rest";
  if (status === null) {
    await db.execute(
      "DELETE FROM habit_logs WHERE habit_id = $1 AND date = $2",
      [habitId, date],
    );
    return "ok";
  }
  await db.execute(
    `INSERT INTO habit_logs (habit_id, date, status, value) VALUES ($1, $2, $3, $4)
     ON CONFLICT (habit_id, date) DO UPDATE SET status = excluded.status, value = excluded.value`,
    [habitId, date, status, value],
  );
  return "ok";
}
