import { describe, expect, it } from "vitest";
import { dailyLimit, daysLeftInMonth } from "./dailyLimit";

const kc = (crowns: number) => crowns * 100;

describe("dailyLimit (CALC-07)", () => {
  it("the PRD example", () => {
    expect(
      dailyLimit({
        budget: kc(7000),
        spentBefore: kc(5900),
        reserved: 0,
        daysLeft: 11,
        spentToday: kc(40),
      }),
    ).toEqual({ allowance: kc(100), shown: kc(60) });
  });

  it("over budget the allowance is 0 and today's spending goes negative", () => {
    expect(
      dailyLimit({
        budget: kc(1000),
        spentBefore: kc(900),
        reserved: kc(500),
        daysLeft: 5,
        spentToday: kc(40),
      }),
    ).toEqual({ allowance: 0, shown: -kc(40) });
  });

  it("rounds down in haléře", () => {
    expect(
      dailyLimit({
        budget: 1000,
        spentBefore: 0,
        reserved: 0,
        daysLeft: 3,
        spentToday: 0,
      })?.allowance,
    ).toBe(333);
  });

  it.each([
    ["not set", 0],
    ["0", 0],
  ])("is not calculated when the budget is %s", (_label, budget) => {
    expect(
      dailyLimit({
        budget,
        spentBefore: 0,
        reserved: 0,
        daysLeft: 3,
        spentToday: 0,
      }),
    ).toBeNull();
  });
});

describe("daysLeftInMonth (CALC-07 D: včetně dneška)", () => {
  it.each([
    ["2026-11-01", 30],
    ["2026-11-25", 6],
    ["2026-11-30", 1],
    ["2026-10-31", 1],
    ["2028-02-01", 29],
  ])("%s has %i days left", (today, days) => {
    expect(daysLeftInMonth(today)).toBe(days);
  });
});
