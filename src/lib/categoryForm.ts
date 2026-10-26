import type { CategoryInput, CategoryKind } from "../db/categories";
import { CATEGORY_COLORS } from "./categoryColors";
import { parseAmount } from "./money";

export interface CategoryFormValues {
  name: string;
  icon: string;
  color: string;
  kind: CategoryKind;
  budget: string; // as typed, "" = no limit
}

export type CategoryFormResult =
  | { ok: true; value: CategoryInput }
  | { ok: false; error: "name" | "icon" | "color" | "budget" };

/** FIN-03 form → category. Validation at the UI → DB boundary (NFR-07). */
export function validateCategoryForm(
  values: CategoryFormValues,
): CategoryFormResult {
  const name = values.name.trim();
  const icon = values.icon.trim();
  if (!name) return { ok: false, error: "name" };
  if (!icon) return { ok: false, error: "icon" };
  if (!(CATEGORY_COLORS as readonly string[]).includes(values.color))
    return { ok: false, error: "color" };

  let monthly_budget = 0;
  const budget = values.budget.trim();
  if (values.kind === "expense" && budget !== "" && budget !== "0") {
    const parsed = parseAmount(budget);
    if (parsed === null) return { ok: false, error: "budget" };
    monthly_budget = parsed;
  }
  return {
    ok: true,
    value: {
      name,
      icon,
      color: values.color,
      kind: values.kind,
      monthly_budget,
    },
  };
}
