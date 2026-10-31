import { addDays } from "../lib/dates";
import {
  reachesEstablished,
  type Frequency,
  type HabitLog,
  type LogStatus,
  type Pause,
} from "../lib/habits";
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

// CALC-06 for one habit ($1 = its id): it may come back when it is
// established or fewer than 3 other active habits are building.
const MAY_RETURN = `((SELECT phase FROM habits WHERE id = $1) = 'established' OR ${BUILDING_COUNT} < 3)`;

/** HAB-02. The type never changes (PRD v0.7, C6): old values would mean nothing. */
export async function updateHabit(
  db: Db,
  id: number,
  input: HabitInput,
): Promise<void> {
  await db.execute(
    `UPDATE habits SET name = $2, icon = $3, identity = $4, target_value = $5, unit = $6,
       frequency = $7, days_mask = $8, weekly_target = $9, anchor = $10, min_version = $11, min_value = $12
     WHERE id = $1`,
    [
      id,
      input.name,
      input.icon,
      input.identity,
      input.target_value,
      input.unit,
      input.frequency,
      input.days_mask,
      input.weekly_target,
      input.anchor,
      input.min_version,
      input.min_value,
    ],
  );
}

/** HAB-02: a pause starts today (CALC-01: paused days are not scheduled). */
export async function pauseHabit(
  db: Db,
  id: number,
  today: string,
): Promise<void> {
  await db.execute(
    "INSERT INTO habit_pauses (habit_id, start_date) VALUES ($1, $2)",
    [id, today],
  );
}

/**
 * HAB-02 + CALC-06: the open pause ends yesterday; a pause started today is
 * removed. Refused when it would be a 4th active building habit.
 * Atomic per statement, as plugin-sql has no safe transactions (PRD Q6).
 */
export async function resumeHabit(
  db: Db,
  id: number,
  today: string,
): Promise<"ok" | "limit"> {
  const open = await db.select<unknown[]>(
    "SELECT 1 FROM habit_pauses WHERE habit_id = $1 AND end_date IS NULL",
    [id],
  );
  if (open.length === 0) return "ok"; // not paused (e.g. a stale double click)
  const yesterday = addDays(today, -1);
  const ended = await db.execute(
    `UPDATE habit_pauses SET end_date = $2
     WHERE habit_id = $1 AND end_date IS NULL AND start_date <= $2 AND ${MAY_RETURN}`,
    [id, yesterday],
  );
  const removed = await db.execute(
    `DELETE FROM habit_pauses
     WHERE habit_id = $1 AND end_date IS NULL AND start_date > $2 AND ${MAY_RETURN}`,
    [id, yesterday],
  );
  return ended.rowsAffected + removed.rowsAffected > 0 ? "ok" : "limit";
}

/**
 * HAB-02: archiving keeps all logs, and the archived days are a pause, so a
 * restored habit does not count them as missed (dev-team review F3).
 */
export async function archiveHabit(
  db: Db,
  id: number,
  today: string,
): Promise<void> {
  await db.execute("UPDATE habits SET archived_at = $2 WHERE id = $1", [
    id,
    today,
  ]);
  await db.execute(
    `INSERT INTO habit_pauses (habit_id, start_date)
     SELECT $1, $2 WHERE NOT EXISTS
       (SELECT 1 FROM habit_pauses WHERE habit_id = $1 AND end_date IS NULL)`,
    [id, today],
  );
}

/**
 * HAB-02 + CALC-06: restore and resume (the archive pause ends yesterday).
 * Refused when it would be a 4th active building habit.
 */
export async function restoreHabit(
  db: Db,
  id: number,
  today: string,
): Promise<"ok" | "limit"> {
  const result = await db.execute(
    `UPDATE habits SET archived_at = NULL WHERE id = $1 AND ${MAY_RETURN}`,
    [id],
  );
  if (result.rowsAffected === 0) return "limit";
  // ponytail: two statements; a single user can't race them, a pool could in theory
  return resumeHabit(db, id, today);
}

/**
 * CALC-05 + HAB-06: store "established" for habits that reached it (one-way,
 * only from building). Returns names that changed now, for a one-time notice.
 * Call before any limit check, so CALC-06 never reads a stale phase.
 */
export async function syncPhases(db: Db, today: string): Promise<string[]> {
  const [habits, logs, pauses] = await Promise.all([
    listHabits(db),
    listLogs(db),
    listPauses(db),
  ]);
  const changed: string[] = [];
  for (const habit of habits) {
    if (habit.phase !== "building" || habit.archived_at) continue;
    const own = <T extends { habit_id: number }>(rows: T[]) =>
      rows.filter((row) => row.habit_id === habit.id);
    if (!reachesEstablished(habit, own(pauses), own(logs), today)) continue;
    const result = await db.execute(
      "UPDATE habits SET phase = 'established' WHERE id = $1 AND phase = 'building'",
      [habit.id],
    );
    if (result.rowsAffected > 0) changed.push(habit.name);
  }
  return changed;
}
