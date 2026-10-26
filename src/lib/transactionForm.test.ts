import { describe, expect, it } from "vitest";
import type { Category } from "../db/categories";
import {
  categoryOptions,
  validateTransactionForm,
  type TransactionFormValues,
} from "./transactionForm";

const cat = (
  id: number,
  kind: Category["kind"],
  archived_at: string | null = null,
): Category => ({
  id,
  name: `c${id}`,
  icon: "x",
  color: "#000",
  kind,
  monthly_budget: 0,
  archived_at,
});

const categories = [
  cat(1, "expense"),
  cat(2, "expense", "2026-09-01"),
  cat(3, "income"),
  cat(4, "income", "2026-09-01"),
];

describe("categoryOptions (FIN-01: jen kategorie zvoleného typu)", () => {
  it("offers active categories of the chosen kind", () => {
    expect(categoryOptions(categories, "expense").map((c) => c.id)).toEqual([
      1,
    ]);
    expect(categoryOptions(categories, "income").map((c) => c.id)).toEqual([3]);
  });

  it("keeps the archived category of an edited transaction, so saving does not move it", () => {
    expect(categoryOptions(categories, "expense", 2).map((c) => c.id)).toEqual([
      1, 2,
    ]);
  });

  it("does not offer the current category under the other kind", () => {
    expect(categoryOptions(categories, "income", 2).map((c) => c.id)).toEqual([
      3,
    ]);
  });
});

describe("validateTransactionForm (FIN-01, NFR-07)", () => {
  const valid: TransactionFormValues = {
    amount: "120,50",
    kind: "expense",
    categoryId: "1",
    date: "2026-10-26",
    note: " rohlíky ",
  };

  it("turns valid form values into a transaction", () => {
    expect(validateTransactionForm(valid, categories)).toEqual({
      ok: true,
      value: {
        amount: 12050,
        category_id: 1,
        date: "2026-10-26",
        note: "rohlíky",
      },
    });
  });

  it("keeps an archived current category valid when editing", () => {
    expect(
      validateTransactionForm({ ...valid, categoryId: "2" }, categories, 2).ok,
    ).toBe(true);
  });

  it.each([
    ["amount", { amount: "0" }],
    ["amount", { amount: "1,234" }],
    ["category", { categoryId: "" }],
    ["category", { categoryId: "3" }], // income category for an expense
    ["category", { categoryId: "2" }], // archived, not the edited one
    ["category", { categoryId: "99" }],
    ["date", { date: "" }],
    ["date", { date: "2026-02-30" }],
  ] as const)("reports %s for %j", (error, change) => {
    expect(
      validateTransactionForm({ ...valid, ...change }, categories),
    ).toEqual({ ok: false, error });
  });

  it("stores an empty note as null", () => {
    const result = validateTransactionForm(
      { ...valid, note: "  " },
      categories,
    );
    expect(result.ok && result.value.note).toBeNull();
  });
});
