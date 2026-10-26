export type BudgetLevel = "ok" | "warning" | "over";

/**
 * FIN-04 colour of a budget bar: up to 80 % ok, 80–100 % warning, over 100 % over.
 * Limit 0 means "no limit", so there is no bar (null). Integer math, no float rounding.
 */
export function budgetLevel(spent: number, limit: number): BudgetLevel | null {
  if (limit <= 0) return null;
  if (spent * 100 <= limit * 80) return "ok";
  return spent <= limit ? "warning" : "over";
}
