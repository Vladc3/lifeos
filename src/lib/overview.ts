import type { CategoryKind } from "../db/categories";
import type { GoalType } from "../db/goals";
import { monthOf } from "./dates";
import { paymentDate } from "./recurring";

interface MoneyRow {
  date: string;
  amount: number; // haléře
  kind: CategoryKind;
}

export interface MonthDay {
  day: number;
  income: number;
  expense: number;
}

/** FIN-09: income and expenses per day, every day of the month is there. */
export function dailySeries(rows: MoneyRow[], month: string): MonthDay[] {
  const days = Number(paymentDate(month, 31).slice(8));
  const series = Array.from({ length: days }, (_, i) => ({
    day: i + 1,
    income: 0,
    expense: 0,
  }));
  for (const row of rows) {
    if (monthOf(row.date) !== month) continue;
    series[Number(row.date.slice(8)) - 1][row.kind] += row.amount;
  }
  return series;
}

/** FIN-09: totals of the month. */
export function monthTotals(rows: MoneyRow[]) {
  const sum = (kind: CategoryKind) =>
    rows
      .filter((row) => row.kind === kind)
      .reduce((total, row) => total + row.amount, 0);
  const income = sum("income");
  const expense = sum("expense");
  return { income, expense, balance: income - expense };
}

interface CategoryLabel {
  id: number;
  name: string;
  icon: string;
  color: string;
}

/** FIN-09: expenses by category, largest first. */
export function categoryShares<T extends CategoryLabel>(
  byCategory: Record<number, number>,
  categories: T[],
) {
  const total = Object.values(byCategory).reduce((sum, n) => sum + n, 0);
  return categories
    .filter((c) => byCategory[c.id])
    .map((c) => ({
      ...c,
      amount: byCategory[c.id],
      percent: Math.round((byCategory[c.id] / total) * 100),
    }))
    .sort((a, b) => b.amount - a.amount);
}

interface OverviewGoal {
  type: GoalType;
  name: string;
  icon: string;
  target_amount: number | null;
  saved: number;
  deposited: number;
}

/** FIN-11 (D6): saving goals and investments at a glance. */
export function financeOverview(
  goals: OverviewGoal[],
  investments: { value: number; deposited: number }[],
) {
  const saving = goals
    .filter((g) => g.type === "saving")
    .map((g) => {
      const saved = g.saved + g.deposited;
      const target = g.target_amount ?? 0;
      return {
        name: `${g.icon} ${g.name}`,
        saved,
        target,
        percent: Math.min(100, Math.floor((saved / target) * 100)),
      };
    });
  return {
    goals: saving,
    saved: saving.reduce((sum, g) => sum + g.saved, 0),
    investmentValue: investments.reduce((sum, i) => sum + i.value, 0),
    invested: investments.reduce((sum, i) => sum + i.deposited, 0),
  };
}
