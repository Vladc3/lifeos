import { describe, expect, it } from "vitest";
import {
  contributionMonths,
  goalPlan,
  goalsThatDontFit,
  isOverdue,
  limitProgress,
  limitResult,
  monthlyContribution,
  moveInOrder,
  noSpendDays,
  reservedThisMonth,
} from "./goals";

describe("contributionMonths (CALC-08: M včetně obou měsíců)", () => {
  it("counts this month and the deadline month", () => {
    expect(contributionMonths("2027-04-30", "2026-10-31")).toBe(7);
    expect(contributionMonths("2027-05-01", "2026-11-01")).toBe(7);
  });

  it("is 1 in the deadline month", () => {
    expect(contributionMonths("2026-10-31", "2026-10-01")).toBe(1);
  });

  it("crosses the year", () => {
    expect(contributionMonths("2027-01-15", "2026-12-20")).toBe(2);
  });

  it("is at least 1 after the deadline", () => {
    expect(contributionMonths("2026-01-15", "2026-10-31")).toBe(1);
  });
});

describe("monthlyContribution (CALC-08)", () => {
  it("rounds up in haléře", () => {
    expect(monthlyContribution(100000, 0, "2026-12-31", "2026-10-01")).toBe(
      33334,
    );
  });

  it("uses what is left to save", () => {
    expect(
      monthlyContribution(3000000, 500000, "2027-04-01", "2026-10-31"),
    ).toBe(357143);
  });

  it("the plan's K4 value: 30 000 Kč over 7 months", () => {
    expect(monthlyContribution(3000000, 0, "2027-04-30", "2026-10-31")).toBe(
      428572,
    );
  });

  it("is 0 when saved reaches the target", () => {
    expect(monthlyContribution(1000, 1000, "2027-01-01", "2026-10-01")).toBe(0);
    expect(monthlyContribution(1000, 1500, "2027-01-01", "2026-10-01")).toBe(0);
  });

  it("after the deadline the rest is due at once (M = 1)", () => {
    expect(
      monthlyContribution(200000, 150000, "2026-09-01", "2026-10-31"),
    ).toBe(50000);
  });
});

describe("isOverdue (CALC-08, R4)", () => {
  it("is false up to and including the deadline", () => {
    expect(isOverdue("2026-10-31", "2026-10-30")).toBe(false);
    expect(isOverdue("2026-10-31", "2026-10-31")).toBe(false);
  });

  it("is true the day after", () => {
    expect(isOverdue("2026-10-31", "2026-11-01")).toBe(true);
  });
});

describe("goalPlan (D3)", () => {
  const goal = {
    target_amount: 300000,
    deadline: "2026-11-30",
    saved: 0,
    paused_at: null,
    achieved_at: null,
  };

  it("is the contribution of an active saving goal", () => {
    expect(goalPlan(goal, "2026-11-01")).toBe(300000);
  });

  it("is 0 for a paused or achieved goal", () => {
    expect(goalPlan({ ...goal, paused_at: "2026-11-01" }, "2026-11-01")).toBe(
      0,
    );
    expect(goalPlan({ ...goal, achieved_at: "2026-11-01" }, "2026-11-01")).toBe(
      0,
    );
  });

  it("is 0 without an amount or deadline: limit and no-spend goals", () => {
    expect(goalPlan({ ...goal, deadline: null }, "2026-11-01")).toBe(0);
    expect(goalPlan({ ...goal, target_amount: null }, "2026-11-01")).toBe(0);
  });
});

describe("reservedThisMonth (CALC-07 P, R5)", () => {
  it("each item reserves the larger of plan and deposits", () => {
    expect(
      reservedThisMonth(
        [
          { plan: 1000, deposited: 1500 },
          { plan: 2000, deposited: 0 },
          { plan: 0, deposited: 400 },
        ],
        0,
      ),
    ).toBe(3900);
  });

  it("adds upcoming payments", () => {
    expect(reservedThisMonth([{ plan: 100, deposited: 0 }], 50)).toBe(150);
  });

  it("is 0 for nothing", () => {
    expect(reservedThisMonth([], 0)).toBe(0);
  });
});

describe("limitProgress (CALC-09)", () => {
  it("is spending divided by the limit, in percent", () => {
    expect(limitProgress(75000, 150000)).toBe(50);
    expect(limitProgress(150000, 150000)).toBe(100);
  });

  it("can go over 100", () => {
    expect(limitProgress(300000, 150000)).toBe(200);
  });
});

describe("limitResult (CALC-09: po skončení měsíce)", () => {
  it("stays open until the month ends, even on the last day", () => {
    expect(limitResult(1000, 1000, "2026-11", "2026-11-30")).toBe("open");
  });

  it("spending equal to the limit is met after the month", () => {
    expect(limitResult(1000, 1000, "2026-11", "2026-12-01")).toBe("met");
  });

  it("spending over the limit is missed after the month", () => {
    expect(limitResult(1001, 1000, "2026-11", "2026-12-01")).toBe("missed");
  });
});

describe("noSpendDays (CALC-10)", () => {
  it("counts past days of the month without an expense", () => {
    expect(
      noSpendDays(["2026-11-02", "2026-11-03"], "2026-11", "2026-11-06"),
    ).toBe(3);
  });

  it("today is pending, so it never counts", () => {
    expect(noSpendDays([], "2026-11", "2026-11-03")).toBe(2);
  });

  it("the first day has nothing to count yet", () => {
    expect(noSpendDays([], "2026-11", "2026-11-01")).toBe(0);
  });

  it("a finished month counts all its days", () => {
    expect(noSpendDays(["2026-11-05"], "2026-11", "2026-12-15")).toBe(29);
  });

  it("the same day twice counts once", () => {
    expect(
      noSpendDays(["2026-11-02", "2026-11-02"], "2026-11", "2026-11-04"),
    ).toBe(2);
  });
});

describe("goalsThatDontFit (FIN-08, D5)", () => {
  const goals = (...remaining: number[]) =>
    remaining.map((value, i) => ({ id: i + 1, remaining: value }));

  it("skips a goal that does not fit, a smaller later one can", () => {
    expect(goalsThatDontFit(goals(800, 500, 100), 1000)).toEqual([2]);
  });

  it("goes by order: the first goals get the money", () => {
    expect(goalsThatDontFit(goals(100, 800, 500), 1000)).toEqual([3]);
  });

  it("a goal fitting exactly is fine", () => {
    expect(goalsThatDontFit(goals(1000), 1000)).toEqual([]);
  });

  it("never flags a goal with nothing left to pay, even when free is negative", () => {
    expect(goalsThatDontFit(goals(0, 100), -2000)).toEqual([2]);
  });

  it("no goals", () => {
    expect(goalsThatDontFit([], 1000)).toEqual([]);
  });
});

describe("moveInOrder (FIN-08)", () => {
  it("moves up and down", () => {
    expect(moveInOrder([1, 2, 3], 2, 0)).toEqual([2, 1, 3]);
    expect(moveInOrder([1, 2, 3], 2, 2)).toEqual([1, 3, 2]);
  });

  it("moves to the ends", () => {
    expect(moveInOrder([1, 2, 3], 3, 0)).toEqual([3, 1, 2]);
    expect(moveInOrder([1, 2, 3], 1, 2)).toEqual([2, 3, 1]);
  });

  it("stays put at the edges", () => {
    expect(moveInOrder([1, 2, 3], 1, -1)).toEqual([1, 2, 3]);
    expect(moveInOrder([1, 2, 3], 3, 3)).toEqual([1, 2, 3]);
  });
});
