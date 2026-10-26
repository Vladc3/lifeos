import { describe, expect, it } from "vitest";
import { CATEGORY_COLORS } from "./categoryColors";
import { validateCategoryForm, type CategoryFormValues } from "./categoryForm";

describe("validateCategoryForm (FIN-03, NFR-07)", () => {
  const valid: CategoryFormValues = {
    name: "  Káva ",
    icon: " ☕ ",
    color: CATEGORY_COLORS[1],
    kind: "expense",
    budget: "1 500",
  };

  it("turns valid values into a category, limit in haléře", () => {
    expect(validateCategoryForm(valid)).toEqual({
      ok: true,
      value: {
        name: "Káva",
        icon: "☕",
        color: CATEGORY_COLORS[1],
        kind: "expense",
        monthly_budget: 150000,
      },
    });
  });

  it.each(["", "0", " "])(
    "an empty or zero limit %j means no limit",
    (budget) => {
      const result = validateCategoryForm({ ...valid, budget });
      expect(result.ok && result.value.monthly_budget).toBe(0);
    },
  );

  it("ignores the limit of an income category (limit only on expenses)", () => {
    const result = validateCategoryForm({ ...valid, kind: "income" });
    expect(result.ok && result.value.monthly_budget).toBe(0);
  });

  it.each([
    ["name", { name: "   " }],
    ["icon", { icon: "" }],
    ["color", { color: "#123456" }],
    ["budget", { budget: "-5" }],
    ["budget", { budget: "abc" }],
  ] as const)("reports %s for %j", (error, change) => {
    expect(validateCategoryForm({ ...valid, ...change })).toEqual({
      ok: false,
      error,
    });
  });
});

describe("CATEGORY_COLORS", () => {
  it("has 8 distinct hex colors", () => {
    expect(CATEGORY_COLORS).toHaveLength(8);
    expect(new Set(CATEGORY_COLORS).size).toBe(8);
    for (const color of CATEGORY_COLORS)
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
  });
});
