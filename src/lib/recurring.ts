import type { CategoryKind } from "../db/categories";
import { monthOf, shiftMonth } from "./dates";

export interface RecurringSchedule {
  day_of_month: number; // 1–31
  first_month: string; // YYYY-MM, fixed at creation (plan F4, D1)
  archived_at: string | null;
}

export interface DueRun {
  month: string; // YYYY-MM
  date: string; // YYYY-MM-DD
}

/** CALC-11: day 29–31 in a shorter month is its last day. */
export function paymentDate(month: string, day: number): string {
  const [year, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return `${month}-${String(Math.min(day, last)).padStart(2, "0")}`;
}

/** D1: the first month whose payment date is not before the day of creation. */
export function firstRunMonth(day: number, today: string): string {
  const month = monthOf(today);
  return paymentDate(month, day) >= today ? month : shiftMonth(month, 1);
}

/** CALC-11: months from first_month up to today that have no run yet. */
export function dueRuns(
  recurring: RecurringSchedule,
  doneMonths: string[],
  today: string,
): DueRun[] {
  if (recurring.archived_at) return [];
  const result: DueRun[] = [];
  const lastMonth = monthOf(today);
  for (
    let month = recurring.first_month;
    month <= lastMonth;
    month = shiftMonth(month, 1)
  ) {
    const date = paymentDate(month, recurring.day_of_month);
    if (date <= today && !doneMonths.includes(month))
      result.push({ month, date });
  }
  return result;
}

/** CALC-07 U (R6): expenses still to come this month, without a run yet. */
export function upcomingRecurring(
  payments: (RecurringSchedule & {
    id: number;
    amount: number;
    kind: CategoryKind;
  })[],
  runs: { recurring_id: number; month: string }[],
  today: string,
): number {
  const month = monthOf(today);
  return payments
    .filter(
      (p) =>
        p.kind === "expense" &&
        !p.archived_at &&
        p.first_month <= month &&
        paymentDate(month, p.day_of_month) > today &&
        !runs.some((r) => r.recurring_id === p.id && r.month === month),
    )
    .reduce((sum, p) => sum + p.amount, 0);
}
