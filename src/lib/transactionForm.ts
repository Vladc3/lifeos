import type { Category, CategoryKind } from "../db/categories";
import type { TransactionInput } from "../db/transactions";
import { isValidDate } from "./dates";
import { parseAmount } from "./money";

export interface TransactionFormValues {
  amount: string; // as typed
  kind: CategoryKind;
  categoryId: string; // <select> value
  date: string; // <input type="date"> value, "" when empty
  note: string;
}

export type TransactionFormResult =
  | { ok: true; value: TransactionInput }
  | { ok: false; error: "amount" | "category" | "date" };

/**
 * FIN-01: only active categories of the chosen kind. When editing, the
 * transaction's own category stays even if archived, otherwise the <select>
 * would show another one and saving would silently move the transaction.
 */
export function categoryOptions(
  categories: Category[],
  kind: CategoryKind,
  currentCategoryId: number | null = null,
): Category[] {
  return categories.filter(
    (c) =>
      c.kind === kind && (c.archived_at === null || c.id === currentCategoryId),
  );
}

/** Validation at the UI → DB boundary (NFR-07). */
export function validateTransactionForm(
  values: TransactionFormValues,
  categories: Category[],
  currentCategoryId: number | null = null,
): TransactionFormResult {
  const amount = parseAmount(values.amount);
  if (amount === null) return { ok: false, error: "amount" };

  const categoryId = Number(values.categoryId);
  const allowed = categoryOptions(categories, values.kind, currentCategoryId);
  if (!allowed.some((c) => c.id === categoryId))
    return { ok: false, error: "category" };

  if (!isValidDate(values.date)) return { ok: false, error: "date" };

  return {
    ok: true,
    value: {
      amount,
      category_id: categoryId,
      date: values.date,
      note: values.note.trim() || null,
    },
  };
}
