import { monthOf } from "./dates";

const monthIndex = (date: string) => {
  const [year, month] = monthOf(date).split("-").map(Number);
  return year * 12 + month;
};

/** CALC-08 M: months from this one to the deadline's, both included, at least 1. */
export function contributionMonths(deadline: string, today: string): number {
  return Math.max(1, monthIndex(deadline) - monthIndex(today) + 1);
}

/** CALC-08: `saved` = deposits before this month, all amounts in haléře. */
export function monthlyContribution(
  target: number,
  saved: number,
  deadline: string,
  today: string,
): number {
  if (saved >= target) return 0;
  return Math.ceil((target - saved) / contributionMonths(deadline, today));
}

/** CALC-08, R4: the deadline day still counts. */
export function isOverdue(deadline: string, today: string): boolean {
  return deadline < today;
}

export interface GoalPlanInput {
  target_amount: number | null;
  deadline: string | null;
  saved: number;
  paused_at: string | null;
  achieved_at: string | null;
}

/** D3: what the goal plans to take this month. Only an active saving goal does. */
export function goalPlan(goal: GoalPlanInput, today: string): number {
  if (goal.paused_at || goal.achieved_at) return 0;
  if (goal.target_amount === null || goal.deadline === null) return 0;
  return monthlyContribution(
    goal.target_amount,
    goal.saved,
    goal.deadline,
    today,
  );
}

/**
 * CALC-07 P (D3, R5, R6): a paid deposit stays reserved, a deposit over the plan
 * lowers the limit. Each goal or account stands on its own.
 */
export function reservedThisMonth(
  items: { plan: number; deposited: number }[],
  upcoming: number,
): number {
  return items.reduce(
    (sum, item) => sum + Math.max(item.plan, item.deposited),
    upcoming,
  );
}
