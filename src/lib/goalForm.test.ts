import { describe, expect, it } from "vitest";
import { validateGoalForm, type GoalFormValues } from "./goalForm";

const trip: GoalFormValues = {
  name: " Dovolená ",
  icon: "🏖️",
  amount: "30 000",
  deadline: "2027-04-30",
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
