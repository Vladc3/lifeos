import {
  dailyLimit,
  daysLeftInMonth,
  type DailyLimit,
} from "../lib/dailyLimit";
import { monthOf } from "../lib/dates";
import { goalPlan, reservedThisMonth } from "../lib/goals";
import { upcomingRecurring, type RecurringSchedule } from "../lib/recurring";
import type { CategoryKind } from "./categories";
import { listGoals } from "./goals";
import { listInvestments } from "./investments";
import { generateRecurring } from "./recurring";
import { getSetting } from "./settings";
import type { Db } from "./types";

export interface DailyLimitData extends DailyLimit {
  budget: number;
  spentBefore: number;
  spentToday: number;
  reserved: number;
  daysLeft: number;
}

interface PaymentRow extends RecurringSchedule {
  id: number;
  amount: number;
  kind: CategoryKind;
}

/**
 * CALC-07 from the DB. Generates first, so a payment due today is never missing
 * from both S and P, whatever the caller did before (plan F4, E2, E9).
 */
export async function loadDailyLimit(
  db: Db,
  today: string,
): Promise<DailyLimitData | null> {
  await generateRecurring(db, today);
  const budget = Number(await getSetting(db, "monthly_budget")) || 0;
  if (!budget) return null;

  const month = monthOf(today);
  // D3: a generated expense from today on stays reserved, it is not today's spending.
  const [spent] = await db.select<
    { before_today: number; on_today: number; generated: number }[]
  >(
    `SELECT
       coalesce(sum(CASE WHEN t.date < $2 THEN t.amount END), 0) AS before_today,
       coalesce(sum(CASE WHEN t.date = $2 AND t.recurring_id IS NULL THEN t.amount END), 0) AS on_today,
       coalesce(sum(CASE WHEN t.date >= $2 AND t.recurring_id IS NOT NULL THEN t.amount END), 0) AS generated
     FROM transactions t JOIN categories c ON c.id = t.category_id
     WHERE c.kind = 'expense' AND substr(t.date, 1, 7) = $1`,
    [month, today],
  );
  const payments = await db.select<PaymentRow[]>(
    `SELECT r.id, r.amount, r.day_of_month, r.first_month, r.archived_at, c.kind
     FROM recurring r JOIN categories c ON c.id = r.category_id`,
  );
  const runs = await db.select<{ recurring_id: number; month: string }[]>(
    "SELECT recurring_id, month FROM recurring_runs WHERE month = $1",
    [month],
  );
  const goals = await listGoals(db, month);
  const investments = await listInvestments(db, month);
  // Money already sent stays reserved even when its goal or account was archived.
  const [archived] = await db.select<{ deposited: number }[]>(
    `SELECT coalesce(sum(amount), 0) AS deposited FROM (
       SELECT d.amount FROM goal_deposits d JOIN goals g ON g.id = d.goal_id
       WHERE g.archived_at IS NOT NULL AND substr(d.date, 1, 7) = $1
       UNION ALL
       SELECT d.amount FROM investment_deposits d JOIN investments i ON i.id = d.investment_id
       WHERE i.archived_at IS NOT NULL AND substr(d.date, 1, 7) = $1
     )`,
    [month],
  );

  const reserved = reservedThisMonth(
    [
      ...goals.map((g) => ({
        plan: goalPlan(g, today),
        deposited: g.deposited,
      })),
      ...investments.map((i) => ({
        plan: i.monthly_deposit,
        deposited: i.deposited,
      })),
      { plan: 0, deposited: archived.deposited },
    ],
    upcomingRecurring(payments, runs, today) + spent.generated,
  );
  const input = {
    budget,
    spentBefore: spent.before_today,
    reserved,
    daysLeft: daysLeftInMonth(today),
    spentToday: spent.on_today,
  };
  const limit = dailyLimit(input);
  return limit && { ...input, ...limit };
}
