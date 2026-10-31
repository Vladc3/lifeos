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
