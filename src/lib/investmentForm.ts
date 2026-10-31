import type { InvestmentInput } from "../db/investments";
import { parseOptionalAmount } from "./money";

/** Investment dialog fields as typed (FIN-12). */
export interface InvestmentFormValues {
  name: string;
  icon: string;
  value: string;
  monthlyDeposit: string;
}

export type InvestmentFormResult =
  | { ok: true; value: InvestmentInput; accountValue: number }
  | { ok: false; error: "name" | "icon" | "value" | "monthlyDeposit" };

/** FIN-12 validation at the UI → DB boundary (NFR-07). Empty amounts mean 0. */
export function validateInvestmentForm(
  values: InvestmentFormValues,
): InvestmentFormResult {
  const name = values.name.trim();
  if (name.length < 1 || name.length > 40) return { ok: false, error: "name" };
  const icon = values.icon.trim();
  if (!icon) return { ok: false, error: "icon" };

  const accountValue = parseOptionalAmount(values.value);
  if (accountValue === null) return { ok: false, error: "value" };
  const monthly = parseOptionalAmount(values.monthlyDeposit);
  if (monthly === null) return { ok: false, error: "monthlyDeposit" };

  return {
    ok: true,
    value: { name, icon, monthly_deposit: monthly },
    accountValue,
  };
}
