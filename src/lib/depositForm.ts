import type { DepositInput } from "../db/goals";
import { isValidDate } from "./dates";
import { parseAmount } from "./money";

export interface DepositFormValues {
  amount: string; // as typed
  date: string; // <input type="date"> value, "" when empty
}

export type DepositFormResult =
  { ok: true; value: DepositInput } | { ok: false; error: "amount" | "date" };

/** FIN-07, E7: never in the future, such a deposit would reach a goal and leave P. */
export function validateDepositForm(
  values: DepositFormValues,
  today: string,
): DepositFormResult {
  const amount = parseAmount(values.amount);
  if (amount === null) return { ok: false, error: "amount" };
  if (!isValidDate(values.date) || values.date > today)
    return { ok: false, error: "date" };
  return { ok: true, value: { amount, date: values.date } };
}
