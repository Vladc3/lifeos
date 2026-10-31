import { describe, expect, it } from "vitest";
import type { Category } from "../db/categories";
import { validateGoalForm, type GoalFormValues } from "./goalForm";

const trip: GoalFormValues = {
  type: "saving",
  name: " Dovolená ",
  icon: "🏖️",
  amount: "30 000",
  deadline: "2027-04-30",
  categoryId: "",
  days: "",
};
const today = "2026-10-31";

describe("validateGoalForm (FIN-06, spořicí cíl, NFR-07)", () => {
  it("turns the form into a saving goal", () => {
    expect(validateGoalForm(trip, today)).toEqual({
      ok: true,
      value: {
        type: "saving",
        name: "Dovolená",
        icon: "🏖️",
        target_amount: 3000000,
        target_days: null,
        category_id: null,
        deadline: "2027-04-30",
      },
    });
  });

  it("accepts tomorrow as the deadline", () => {
    expect(
      validateGoalForm({ ...trip, deadline: "2026-11-01" }, today).ok,
    ).toBe(true);
  });

  it("refuses today and the past", () => {
    for (const deadline of ["2026-10-31", "2026-01-01"])
      expect(validateGoalForm({ ...trip, deadline }, today)).toEqual({
        ok: false,
        error: "deadline",
      });
  });

  it("an overdue goal can be edited without a new deadline (E7, R4)", () => {
    const overdue = { ...trip, deadline: "2026-09-01" };
    expect(validateGoalForm(overdue, today, "2026-09-01").ok).toBe(true);
    expect(validateGoalForm(overdue, today, "2026-08-01")).toEqual({
      ok: false,
      error: "deadline",
    });
  });

  it.each([
    ["name", { name: "  " }],
    ["name", { name: "x".repeat(41) }],
    ["icon", { icon: " " }],
    ["amount", { amount: "" }],
    ["amount", { amount: "0" }],
    ["deadline", { deadline: "" }],
    ["deadline", { deadline: "2027-02-30" }],
  ] as const)("reports %s for %j", (error, change) => {
    expect(validateGoalForm({ ...trip, ...change }, today)).toEqual({
      ok: false,
      error,
    });
  });
});

describe("validateGoalForm (FIN-06, limitový a návykový cíl)", () => {
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
  const limit: GoalFormValues = {
    ...trip,
    type: "limit",
    amount: "1 500",
    deadline: "",
    categoryId: "1",
  };
  const noSpend: GoalFormValues = {
    ...trip,
    type: "no_spend",
    amount: "",
    deadline: "",
    days: "10",
  };

  it("a limit goal has a category and an amount, nothing else", () => {
    expect(validateGoalForm(limit, today, null, categories)).toMatchObject({
      ok: true,
      value: {
        type: "limit",
        target_amount: 150000,
        category_id: 1,
        target_days: null,
        deadline: null,
      },
    });
  });

  it("a no-spend goal has days, nothing else", () => {
    expect(validateGoalForm(noSpend, today, null, categories)).toMatchObject({
      ok: true,
      value: {
        type: "no_spend",
        target_days: 10,
        target_amount: null,
        category_id: null,
        deadline: null,
      },
    });
  });

  it("ignores leftovers of another type", () => {
    expect(
      validateGoalForm(
        { ...limit, days: "5", deadline: "2027-01-01" },
        today,
        null,
        categories,
      ),
    ).toMatchObject({ value: { target_days: null, deadline: null } });
  });

  it("accepts days 1 and 31", () => {
    for (const days of ["1", "31"])
      expect(
        validateGoalForm({ ...noSpend, days }, today, null, categories).ok,
      ).toBe(true);
  });

  it.each([
    ["category", { categoryId: "" }],
    ["category", { categoryId: "2" }], // income
    ["category", { categoryId: "3" }], // archived
    ["amount", { amount: "" }],
  ] as const)("a limit goal reports %s for %j", (error, change) => {
    expect(
      validateGoalForm({ ...limit, ...change }, today, null, categories),
    ).toEqual({ ok: false, error });
  });

  it.each(["", "0", "32", "1,5"])("a no-spend goal refuses %j days", (days) => {
    expect(
      validateGoalForm({ ...noSpend, days }, today, null, categories),
    ).toEqual({ ok: false, error: "days" });
  });

  it("keeps an archived category when editing a goal that uses it", () => {
    expect(
      validateGoalForm(
        { ...limit, categoryId: "3" },
        today,
        null,
        categories,
        3,
      ).ok,
    ).toBe(true);
  });
});
