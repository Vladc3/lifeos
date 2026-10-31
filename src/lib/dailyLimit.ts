import { daysBetween, monthOf } from "./dates";
import { paymentDate } from "./recurring";

export interface DailyLimitInput {
  budget: number; // B, haléře, 0 = not set
  spentBefore: number; // S
  reserved: number; // P (plan F4, D3)
  daysLeft: number; // D
  spentToday: number; // without generated payments (D3)
}

export interface DailyLimit {
  allowance: number; // A
  shown: number; // A − spent today, can be negative
}

/** CALC-07. Null when no budget is set (DNE-03). */
export function dailyLimit(input: DailyLimitInput): DailyLimit | null {
  if (!input.budget) return null;
  const free = input.budget - input.spentBefore - input.reserved;
  const allowance = Math.max(0, Math.floor(free / input.daysLeft));
  return { allowance, shown: allowance - input.spentToday };
}

/** CALC-07 D: days left in the month, today included. */
export function daysLeftInMonth(today: string): number {
  return daysBetween(today, paymentDate(monthOf(today), 31)) + 1;
}
