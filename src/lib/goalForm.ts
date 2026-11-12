import type { Category } from "../db/categories";
import type { GoalInput, GoalType } from "../db/goals";
import { isValidDate } from "./dates";
import { parseAmount } from "./money";
import { categoryOptions } from "./transactionForm";

/** Goal dialog fields as typed (FIN-06). */
export interface GoalFormValues {
  type: GoalType;
  name: string;
  icon: string;
  amount: string;
  deadline: string; // <input type="date"> value, "" when empty
  categoryId: string; // <select> value
  days: string;
}

export type GoalFormResult =
  | { ok: true; value: GoalInput }
  | {
      ok: false;
      error: "name" | "icon" | "amount" | "deadline" | "category" | "days";
    };

/**
 * FIN-06 validation at the UI → DB boundary (NFR-07), fields by goal type. The
 * deadline must be in the future, or stay as it was, so an overdue goal can be
 * renamed (R4).
 */
export function validateGoalForm(
  values: GoalFormValues,
  today: string,
  originalDeadline: string | null = null,
  categories: Category[] = [],
  currentCategoryId: number | null = null,
): GoalFormResult {
  const name = values.name.trim();
  if (name.length < 1 || name.length > 40) return { ok: false, error: "name" };
  const icon = values.icon.trim();
  if (!icon) return { ok: false, error: "icon" };

  const empty = {
    name,
    icon,
    target_amount: null,
    target_days: null,
    category_id: null,
    deadline: null,
  };

  if (values.type === "no_spend") {
    const days = /^\d+$/.test(values.days.trim()) ? Number(values.days) : 0;
    if (days < 1 || days > 31) return { ok: false, error: "days" };
    return {
      ok: true,
      value: { ...empty, type: "no_spend", target_days: days },
    };
  }

  const amount = parseAmount(values.amount);
  if (amount === null) return { ok: false, error: "amount" };

  if (values.type === "limit") {
    const categoryId = Number(values.categoryId);
    const allowed = categoryOptions(categories, "expense", currentCategoryId);
    if (!allowed.some((c) => c.id === categoryId))
      return { ok: false, error: "category" };
    return {
      ok: true,
      value: {
        ...empty,
        type: "limit",
        target_amount: amount,
        category_id: categoryId,
      },
    };
  }

  const { deadline } = values;
  if (
    !isValidDate(deadline) ||
    (deadline <= today && deadline !== originalDeadline)
  )
    return { ok: false, error: "deadline" };

  return {
    ok: true,
    value: { ...empty, type: "saving", target_amount: amount, deadline },
  };
}
