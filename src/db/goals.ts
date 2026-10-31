import type { Db } from "./types";

export type GoalType = "saving" | "limit" | "no_spend";

export interface GoalInput {
  type: GoalType;
  name: string;
  icon: string;
  target_amount: number | null; // haléře
  target_days: number | null;
  category_id: number | null;
  deadline: string | null; // YYYY-MM-DD
}

export interface Goal extends GoalInput {
  id: number;
  priority: number;
  paused_at: string | null;
  achieved_at: string | null;
  saved: number; // deposits before the month (CALC-08 saved)
  deposited: number; // deposits in the month (CALC-07)
}

/** FIN-06: active and paused goals by priority, with the deposit sums of a month (YYYY-MM). */
export function listGoals(db: Db, month: string): Promise<Goal[]> {
  return db.select<Goal[]>(
    `SELECT g.id, g.type, g.name, g.icon, g.target_amount, g.target_days, g.category_id,
       g.deadline, g.priority, g.paused_at, g.achieved_at,
       coalesce((SELECT sum(d.amount) FROM goal_deposits d
         WHERE d.goal_id = g.id AND substr(d.date, 1, 7) < $1), 0) AS saved,
       coalesce((SELECT sum(d.amount) FROM goal_deposits d
         WHERE d.goal_id = g.id AND substr(d.date, 1, 7) = $1), 0) AS deposited
     FROM goals g WHERE g.archived_at IS NULL ORDER BY g.priority, g.id`,
    [month],
  );
}

/** One statement, so two saves cannot read the same last priority. */
export async function createGoal(db: Db, input: GoalInput): Promise<void> {
  await db.execute(
    `INSERT INTO goals (type, name, icon, target_amount, target_days, category_id, deadline, priority)
     SELECT $1, $2, $3, $4, $5, $6, $7, coalesce(max(priority), 0) + 1 FROM goals`,
    [
      input.type,
      input.name,
      input.icon,
      input.target_amount,
      input.target_days,
      input.category_id,
      input.deadline,
    ],
  );
}

/** The type of a goal never changes, so it is not updated. */
export async function updateGoal(
  db: Db,
  id: number,
  input: GoalInput,
): Promise<void> {
  await db.execute(
    `UPDATE goals SET name = $1, icon = $2, target_amount = $3, target_days = $4,
       category_id = $5, deadline = $6 WHERE id = $7`,
    [
      input.name,
      input.icon,
      input.target_amount,
      input.target_days,
      input.category_id,
      input.deadline,
      id,
    ],
  );
}

export async function pauseGoal(
  db: Db,
  id: number,
  today: string,
): Promise<void> {
  await db.execute("UPDATE goals SET paused_at = $1 WHERE id = $2", [
    today,
    id,
  ]);
}

export async function resumeGoal(db: Db, id: number): Promise<void> {
  await db.execute("UPDATE goals SET paused_at = NULL WHERE id = $1", [id]);
}

export async function archiveGoal(
  db: Db,
  id: number,
  today: string,
): Promise<void> {
  await db.execute("UPDATE goals SET archived_at = $1 WHERE id = $2", [
    today,
    id,
  ]);
}
