import { describe, expect, it } from "vitest";
import { contributionMonths, isOverdue, monthlyContribution } from "./goals";

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
