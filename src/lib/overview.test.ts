import { describe, expect, it } from "vitest";
import {
  categoryShares,
  dailySeries,
  financeOverview,
  monthTotals,
} from "./overview";

const expense = (date: string, amount: number) => ({
  date,
  amount,
  kind: "expense" as const,
});
const income = (date: string, amount: number) => ({
  date,
  amount,
  kind: "income" as const,
});

describe("dailySeries (FIN-09)", () => {
  it("has every day of the month, also empty ones", () => {
    const days = dailySeries([], "2026-11");
    expect(days).toHaveLength(30);
    expect(days[0]).toEqual({ day: 1, income: 0, expense: 0 });
    expect(days[29].day).toBe(30);
  });

  it("knows February of a leap year", () => {
    expect(dailySeries([], "2028-02")).toHaveLength(29);
  });

  it("sums income and expenses per day", () => {
    const days = dailySeries(
      [
        expense("2026-11-02", 100),
        expense("2026-11-02", 20),
        income("2026-11-02", 500),
        expense("2026-11-30", 7),
      ],
      "2026-11",
    );
    expect(days[1]).toEqual({ day: 2, income: 500, expense: 120 });
    expect(days[29].expense).toBe(7);
  });

  it("ignores another month", () => {
    const days = dailySeries([expense("2026-10-02", 100)], "2026-11");
    expect(days.every((d) => d.expense === 0)).toBe(true);
  });
});

describe("monthTotals (FIN-09)", () => {
  it("gives income, expenses and what is left", () => {
    expect(
      monthTotals([
        expense("2026-11-02", 100),
        income("2026-11-03", 500),
        expense("2026-11-04", 50),
      ]),
    ).toEqual({ income: 500, expense: 150, balance: 350 });
  });

  it("the balance can be negative", () => {
    expect(monthTotals([expense("2026-11-02", 100)]).balance).toBe(-100);
  });
});

describe("categoryShares (FIN-09)", () => {
  const categories = [
    { id: 1, name: "Jídlo", icon: "🛒", color: "#111111" },
    { id: 2, name: "Zábava", icon: "🎮", color: "#222222" },
    { id: 3, name: "Škola", icon: "📚", color: "#333333" },
  ];

  it("sorts from the largest and gives percent of all expenses", () => {
    expect(categoryShares({ 1: 250, 2: 750 }, categories)).toEqual([
      { ...categories[1], amount: 750, percent: 75 },
      { ...categories[0], amount: 250, percent: 25 },
    ]);
  });

  it("is empty without expenses", () => {
    expect(categoryShares({}, categories)).toEqual([]);
  });

  it("keeps an amount of a category it does not know under no name", () => {
    expect(categoryShares({ 9: 100 }, categories)).toEqual([]);
  });
});

describe("financeOverview (FIN-11, D6)", () => {
  const goal = {
    type: "saving" as const,
    name: "Dovolená",
    icon: "🏖️",
    target_amount: 3000000,
    saved: 500000,
    deposited: 100000,
    paused_at: null,
  };

  it("sums saving goals with this month's deposits", () => {
    expect(
      financeOverview(
        [goal, { ...goal, name: "Kurz", target_amount: 200000, saved: 0 }],
        [],
      ).goals,
    ).toEqual([
      { name: "🏖️ Dovolená", saved: 600000, target: 3000000, percent: 20 },
      { name: "🏖️ Kurz", saved: 100000, target: 200000, percent: 50 },
    ]);
  });

  it("caps the percent of an overfilled goal", () => {
    expect(
      financeOverview([{ ...goal, target_amount: 100 }], []).goals[0].percent,
    ).toBe(100);
  });

  it("leaves out limit and no-spend goals", () => {
    expect(
      financeOverview(
        [
          { ...goal, type: "limit" },
          { ...goal, type: "no_spend" },
        ],
        [],
      ).goals,
    ).toEqual([]);
  });

  it("sums investments and deposits of the month", () => {
    expect(
      financeOverview(
        [],
        [
          { value: 4000000, deposited: 200000 },
          { value: 100, deposited: 0 },
        ],
      ),
    ).toMatchObject({ investmentValue: 4000100, invested: 200000 });
  });

  it("is zero with nothing", () => {
    expect(financeOverview([], [])).toEqual({
      goals: [],
      saved: 0,
      investmentValue: 0,
      invested: 0,
    });
  });

  it("sums saved money over goals", () => {
    expect(financeOverview([goal, goal], []).saved).toBe(1200000);
  });
});
