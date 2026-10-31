import { monthOf } from "./dates";
import { paymentDate } from "./recurring";

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

/** CALC-09: spending of the month against the limit, in percent, can exceed 100. */
export function limitProgress(spent: number, limit: number): number {
  return Math.round((spent / limit) * 100);
}

/** CALC-09: decided only after the month ends. */
export function limitResult(
  spent: number,
  limit: number,
  month: string,
  today: string,
): "open" | "met" | "missed" {
  if (month >= monthOf(today)) return "open";
  return spent <= limit ? "met" : "missed";
}

/**
 * CALC-10: past days of the month without an expense. `spendDates` leave out
 * recurring payments, today is pending, so it never counts yet.
 */
export function noSpendDays(
  spendDates: string[],
  month: string,
  today: string,
): number {
  const lastDay = paymentDate(month, 31);
  const end = lastDay < today ? lastDay : today;
  if (end.slice(0, 7) !== month) return 0;
  const days = Number(end.slice(8)) - (lastDay < today ? 0 : 1);
  return days - new Set(spendDates.filter((d) => d <= end && d !== today)).size;
}

/**
 * FIN-08 (D5): goals in priority order take what is free. One that does not fit
 * is flagged and skipped, so a smaller later one can still fit. Nothing left to
 * pay is never flagged, even when free is negative.
 */
export function goalsThatDontFit(
  goals: { id: number; remaining: number }[],
  free: number,
): number[] {
  const flagged: number[] = [];
  let left = free;
  for (const goal of goals) {
    if (goal.remaining <= 0) continue;
    if (goal.remaining > left) flagged.push(goal.id);
    else left -= goal.remaining;
  }
  return flagged;
}

/** FIN-08: the order after moving `id` to position `to`. Out of range changes nothing. */
export function moveInOrder(ids: number[], id: number, to: number): number[] {
  if (to < 0 || to >= ids.length) return ids;
  const rest = ids.filter((other) => other !== id);
  return [...rest.slice(0, to), id, ...rest.slice(to)];
}
