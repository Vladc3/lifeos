import type { CategoryInput, CategoryKind } from "../db/categories";
import { CATEGORY_COLORS } from "./categoryColors";
import { parseOptionalAmount } from "./money";

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

  // A limit only exists on expense categories, an income one ignores the field.
  const monthly_budget =
    values.kind === "expense" ? parseOptionalAmount(values.budget) : 0;
  if (monthly_budget === null) return { ok: false, error: "budget" };
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
