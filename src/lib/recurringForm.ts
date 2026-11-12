import type { Category, CategoryKind } from "../db/categories";
import type { RecurringInput } from "../db/recurring";
import { parseAmount } from "./money";
import { categoryOptions } from "./transactionForm";

export interface RecurringFormValues {
  name: string;
  amount: string; // as typed
  kind: CategoryKind;
  categoryId: string; // <select> value
  day: string; // as typed
}

export type RecurringFormResult =
  | { ok: true; value: RecurringInput }
  | { ok: false; error: "name" | "amount" | "category" | "day" };

/** FIN-05 validation at the UI → DB boundary (NFR-07). */
export function validateRecurringForm(
  values: RecurringFormValues,
  categories: Category[],
  currentCategoryId: number | null = null,
): RecurringFormResult {
  const name = values.name.trim();
  if (name.length < 1 || name.length > 40) return { ok: false, error: "name" };

  const amount = parseAmount(values.amount);
  if (amount === null) return { ok: false, error: "amount" };

  const categoryId = Number(values.categoryId);
  const allowed = categoryOptions(categories, values.kind, currentCategoryId);
  if (!allowed.some((c) => c.id === categoryId))
    return { ok: false, error: "category" };

  const day = /^\d+$/.test(values.day.trim()) ? Number(values.day) : 0;
  if (day < 1 || day > 31) return { ok: false, error: "day" };

  return {
    ok: true,
    value: { name, amount, category_id: categoryId, day_of_month: day },
  };
}
