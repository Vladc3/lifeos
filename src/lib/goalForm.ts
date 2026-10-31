import type { GoalInput } from "../db/goals";
import { isValidDate } from "./dates";
import { parseAmount } from "./money";

/** Goal dialog fields as typed (FIN-06). */
export interface GoalFormValues {
  name: string;
  icon: string;
  amount: string;
  deadline: string; // <input type="date"> value, "" when empty
}

export type GoalFormResult =
  | { ok: true; value: GoalInput }
  | { ok: false; error: "name" | "icon" | "amount" | "deadline" };

/**
 * FIN-06 validation at the UI → DB boundary (NFR-07). The deadline must be in
 * the future, or stay as it was, so an overdue goal can be renamed (R4).
 */
export function validateGoalForm(
  values: GoalFormValues,
  today: string,
  originalDeadline: string | null = null,
): GoalFormResult {
  const name = values.name.trim();
  if (name.length < 1 || name.length > 40) return { ok: false, error: "name" };
  const icon = values.icon.trim();
  if (!icon) return { ok: false, error: "icon" };

  const amount = parseAmount(values.amount);
  if (amount === null) return { ok: false, error: "amount" };

  const { deadline } = values;
  if (
    !isValidDate(deadline) ||
    (deadline <= today && deadline !== originalDeadline)
  )
    return { ok: false, error: "deadline" };

  return {
    ok: true,
    value: {
      type: "saving",
      name,
      icon,
      target_amount: amount,
      target_days: null,
      category_id: null,
      deadline,
    },
  };
}
