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

export interface DepositInput {
  date: string; // YYYY-MM-DD, not in the future
  amount: number; // haléře, > 0
}

export interface Deposit extends DepositInput {
  id: number;
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

/**
 * D4: reached from all deposits, including this month's (CALC-08 saved leaves
 * them out). One statement, in code rather than a trigger: `today` is local.
 */
async function syncAchieved(db: Db, id: number, today: string): Promise<void> {
  await db.execute(
    `UPDATE goals SET achieved_at = CASE
       WHEN (SELECT coalesce(sum(d.amount), 0) FROM goal_deposits d WHERE d.goal_id = goals.id)
         >= target_amount THEN coalesce(achieved_at, $1)
     END
     WHERE id = $2 AND type = 'saving'`,
    [today, id],
  );
}

/** The type of a goal never changes, so it is not updated. */
export async function updateGoal(
  db: Db,
  id: number,
  input: GoalInput,
  today: string,
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
  await syncAchieved(db, id, today);
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

export function listDeposits(db: Db, goalId: number): Promise<Deposit[]> {
  return db.select<Deposit[]>(
    "SELECT id, date, amount FROM goal_deposits WHERE goal_id = $1 ORDER BY date DESC, id DESC",
    [goalId],
  );
}

/** FIN-07: a deposit is not an expense, so it is not a transaction. */
export async function addDeposit(
  db: Db,
  goalId: number,
  input: DepositInput,
  today: string,
): Promise<void> {
  await db.execute(
    "INSERT INTO goal_deposits (goal_id, date, amount) VALUES ($1, $2, $3)",
    [goalId, input.date, input.amount],
  );
  await syncAchieved(db, goalId, today);
}

export async function deleteDeposit(
  db: Db,
  id: number,
  goalId: number,
  today: string,
): Promise<void> {
  await db.execute("DELETE FROM goal_deposits WHERE id = $1", [id]);
  await syncAchieved(db, goalId, today);
}
