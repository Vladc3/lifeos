import { describe, expect, it } from "vitest";
import type { Category } from "../db/categories";
import {
  validateRecurringForm,
  type RecurringFormValues,
} from "./recurringForm";

const category = (id: number, change: Partial<Category> = {}): Category => ({
  id,
  name: `c${id}`,
  icon: "x",
  color: "#000000",
  kind: "expense",
  monthly_budget: 0,
  archived_at: null,
  ...change,
});
const categories = [
  category(1),
  category(2, { kind: "income" }),
  category(3, { archived_at: "2026-01-01" }),
];

const rent: RecurringFormValues = {
  name: " Nájem ",
  amount: "9 000",
  kind: "expense",
  categoryId: "1",
  day: "5",
};

describe("validateRecurringForm (FIN-05, NFR-07)", () => {
  it("turns the form into a payment", () => {
    expect(validateRecurringForm(rent, categories)).toEqual({
      ok: true,
      value: {
        name: "Nájem",
        amount: 900000,
        category_id: 1,
        day_of_month: 5,
      },
    });
  });

  it("allows a recurring income", () => {
    const result = validateRecurringForm(
      { ...rent, kind: "income", categoryId: "2" },
      categories,
    );
    expect(result.ok && result.value.category_id).toBe(2);
  });

  it("accepts days 1 and 31", () => {
    expect(validateRecurringForm({ ...rent, day: "1" }, categories).ok).toBe(
      true,
    );
    expect(validateRecurringForm({ ...rent, day: "31" }, categories).ok).toBe(
      true,
    );
  });

  it("keeps an archived category only when editing a payment that uses it", () => {
    const values = { ...rent, categoryId: "3" };
    expect(validateRecurringForm(values, categories)).toEqual({
      ok: false,
      error: "category",
    });
    expect(validateRecurringForm(values, categories, 3).ok).toBe(true);
  });

  it.each([
    ["name", { name: "  " }],
    ["name", { name: "x".repeat(41) }],
    ["amount", { amount: "" }],
    ["amount", { amount: "0" }],
    ["category", { categoryId: "" }],
    ["category", { categoryId: "2" }], // income category for an expense
    ["day", { day: "" }],
    ["day", { day: "0" }],
    ["day", { day: "32" }],
    ["day", { day: "1,5" }],
  ] as const)("reports %s for %j", (error, change) => {
    expect(validateRecurringForm({ ...rent, ...change }, categories)).toEqual({
      ok: false,
      error,
    });
  });
});
