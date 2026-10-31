import { beforeEach, describe, expect, it } from "vitest";
import { loadDailyLimit } from "./dailyLimit";
import {
  addDeposit,
  archiveGoal,
  createGoal,
  pauseGoal,
  type GoalInput,
} from "./goals";
import {
  addInvestmentDeposit,
  archiveInvestment,
  createInvestment,
} from "./investments";
import {
  archiveRecurring,
  createRecurring,
  updateRecurring,
  type RecurringInput,
} from "./recurring";
import { setSetting } from "./settings";
import { createTestDb, must } from "./testDb";
import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from "./transactions";
import type { Db } from "./types";

let db: Db;
beforeEach(async () => {
  db = createTestDb();
  await setSetting(db, "monthly_budget", String(kc(15000)));
});

const kc = (crowns: number) => crowns * 100;
const FOOD = 1; // first default expense category
const WORK = 11; // first default income category

const spend = (date: string, crowns: number, category_id = FOOD) =>
  createTransaction(db, {
    date,
    amount: kc(crowns),
    category_id,
    note: null,
  });

const rent: RecurringInput = {
  name: "Nájem",
  amount: kc(9000),
  category_id: FOOD,
  day_of_month: 25,
};

const trip: GoalInput = {
  type: "saving",
  name: "Dovolená",
  icon: "🏖️",
  target_amount: kc(3000),
  target_days: null,
  category_id: null,
  deadline: "2026-11-30", // M = 1 in November, so the plan is the whole target
};

const load = async (today: string) =>
  must((await loadDailyLimit(db, today)) ?? undefined);
const generated = () =>
  db.select<{ id: number; date: string }[]>(
    "SELECT id, date FROM transactions WHERE recurring_id IS NOT NULL ORDER BY date",
  );

describe("no budget (CALC-07, DNE-03)", () => {
  it("is not calculated without a budget", async () => {
    await setSetting(db, "monthly_budget", "");
    expect(await loadDailyLimit(db, "2026-11-01")).toBeNull();
  });
});

describe("S and today's spending (CALC-07)", () => {
  it("S is only expenses of this month before today", async () => {
    await spend("2026-11-10", 100); // yesterday
    await spend("2026-11-11", 40); // today
    await spend("2026-11-12", 7000); // tomorrow
    await spend("2026-10-31", 5000); // last month
    await spend("2026-11-10", 9000, WORK); // income
    expect(await load("2026-11-11")).toMatchObject({
      spentBefore: kc(100),
      spentToday: kc(40),
      daysLeft: 20,
      allowance: kc(745),
      shown: kc(705),
    });
  });
});

describe("R5: a paid deposit stays reserved", () => {
  beforeEach(async () => {
    await createInvestment(
      db,
      { name: "ETF", icon: "📈", monthly_deposit: kc(3000) },
      0,
    );
  });
  const deposit = (crowns: number, date = "2026-11-01") =>
    addInvestmentDeposit(db, 1, { date, amount: kc(crowns) });

  it("reserves the plan before the deposit", async () => {
    expect((await load("2026-11-01")).allowance).toBe(kc(400));
  });

  it("the limit stays after the deposit", async () => {
    await deposit(3000);
    expect((await load("2026-11-01")).allowance).toBe(kc(400));
  });

  it("a deposit over the plan lowers the limit", async () => {
    await deposit(5000);
    expect((await load("2026-11-01")).allowance).toBe(33333);
  });

  it("a deposit from last month does not count", async () => {
    await deposit(5000, "2026-10-31");
    expect((await load("2026-11-01")).reserved).toBe(kc(3000));
  });

  it("an archived account keeps only this month's deposits", async () => {
    await deposit(500);
    await archiveInvestment(db, 1, "2026-11-02");
    expect((await load("2026-11-02")).reserved).toBe(kc(500));
  });
});

describe("P for saving goals (D3)", () => {
  it("each goal reserves max(plan, deposits), others are not reduced", async () => {
    await createGoal(db, { ...trip, target_amount: kc(1000) });
    await createGoal(db, { ...trip, name: "Kolo", target_amount: kc(2000) });
    await addDeposit(
      db,
      1,
      { date: "2026-11-01", amount: kc(1500) },
      "2026-11-01",
    );
    expect((await load("2026-11-01")).reserved).toBe(kc(3500));
  });

  it("a paused goal has no plan, its deposits stay", async () => {
    await createGoal(db, { ...trip, target_amount: kc(1000) });
    await pauseGoal(db, 1, "2026-11-01");
    expect((await load("2026-11-01")).reserved).toBe(0);
    await addDeposit(
      db,
      1,
      { date: "2026-11-01", amount: kc(400) },
      "2026-11-01",
    );
    expect((await load("2026-11-01")).reserved).toBe(kc(400));
  });

  it("an achieved goal keeps its deposits", async () => {
    await createGoal(db, { ...trip, target_amount: kc(1000) });
    await addDeposit(
      db,
      1,
      { date: "2026-11-01", amount: kc(1000) },
      "2026-11-01",
    );
    expect((await load("2026-11-01")).reserved).toBe(kc(1000));
  });

  it("an archived goal keeps only this month's deposits", async () => {
    await createGoal(db, { ...trip, target_amount: kc(1000) });
    await addDeposit(
      db,
      1,
      { date: "2026-11-01", amount: kc(300) },
      "2026-11-01",
    );
    await archiveGoal(db, 1, "2026-11-02");
    expect((await load("2026-11-02")).reserved).toBe(kc(300));
  });

  it("an archived goal or account does not bring back older deposits", async () => {
    await createGoal(db, { ...trip, target_amount: kc(1000) });
    await addDeposit(
      db,
      1,
      { date: "2026-10-01", amount: kc(300) },
      "2026-10-01",
    );
    await archiveGoal(db, 1, "2026-11-02");
    await createInvestment(
      db,
      { name: "ETF", icon: "📈", monthly_deposit: 0 },
      0,
    );
    await addInvestmentDeposit(db, 1, {
      date: "2026-10-01",
      amount: kc(200),
    });
    await archiveInvestment(db, 1, "2026-11-02");
    expect((await load("2026-11-02")).reserved).toBe(0);
  });

  it("saved before this month lowers the plan (CALC-08)", async () => {
    await createGoal(db, trip);
    await addDeposit(
      db,
      1,
      { date: "2026-10-01", amount: kc(1000) },
      "2026-10-01",
    );
    expect((await load("2026-11-01")).reserved).toBe(kc(2000));
  });
});

describe("R6: upcoming recurring payments", () => {
  beforeEach(async () => {
    await createRecurring(db, rent, "2026-11-01");
  });

  it("reserves the rent from the start of the month", async () => {
    expect((await load("2026-11-01")).allowance).toBe(kc(200));
  });

  it("on its day the rent stays reserved and is not today's spending", async () => {
    expect(await load("2026-11-25")).toMatchObject({
      spentBefore: 0,
      spentToday: 0,
      reserved: kc(9000),
      daysLeft: 6,
      allowance: kc(1000),
      shown: kc(1000),
    });
  });

  it("the day after it is in S", async () => {
    expect(await load("2026-11-26")).toMatchObject({
      spentBefore: kc(9000),
      reserved: 0,
      allowance: kc(1200),
    });
  });

  it("generated today and moved to a later day stays reserved", async () => {
    await load("2026-11-25");
    const { id } = must((await generated())[0]);
    await updateTransaction(db, id, {
      date: "2026-11-27",
      amount: kc(9000),
      category_id: FOOD,
      note: null,
    });
    expect(await load("2026-11-25")).toMatchObject({
      reserved: kc(9000),
      allowance: kc(1000),
    });
  });

  it("a generated payment deleted today is gone from the limit", async () => {
    await load("2026-11-25");
    await deleteTransaction(db, must((await generated())[0]).id);
    expect((await load("2026-11-25")).reserved).toBe(0);
  });

  it("an archived payment reserves nothing", async () => {
    await archiveRecurring(db, 1, "2026-11-01");
    expect((await load("2026-11-02")).reserved).toBe(0);
  });

  it("a day moved to later after this month's run does not reserve twice", async () => {
    await updateRecurring(db, 1, { ...rent, day_of_month: 5 }, "2026-11-04");
    await load("2026-11-10");
    await updateRecurring(db, 1, { ...rent, day_of_month: 25 }, "2026-11-11");
    expect((await load("2026-11-11")).reserved).toBe(0);
  });
});

describe("R6: what stays out of U", () => {
  it("an income generated today", async () => {
    await setSetting(db, "monthly_budget", String(kc(50000)));
    await createRecurring(
      db,
      { ...rent, amount: kc(40000), category_id: WORK, day_of_month: 11 },
      "2026-11-01",
    );
    expect(await load("2026-11-11")).toMatchObject({
      reserved: 0,
      daysLeft: 20,
      allowance: kc(2500),
    });
  });

  it("a future income", async () => {
    await createRecurring(db, { ...rent, category_id: WORK }, "2026-11-01");
    expect((await load("2026-11-02")).reserved).toBe(0);
  });

  it("a payment before its first month, after a change of day", async () => {
    await createRecurring(
      db,
      { ...rent, day_of_month: 5 },
      "2026-11-20", // first_month is December
    );
    await updateRecurring(db, 1, rent, "2026-11-22");
    expect(await load("2026-11-22")).toMatchObject({
      reserved: 0,
      daysLeft: 9,
      allowance: 166666,
    });
  });
});

describe("order of generation (Skeptic round 2)", () => {
  it("a payment due today is generated by the load itself", async () => {
    await createRecurring(db, rent, "2026-11-01");
    expect((await load("2026-11-25")).reserved).toBe(kc(9000));
    expect((await generated()).map((t) => t.date)).toEqual(["2026-11-25"]);
  });
});

describe("freeForGoals (FIN-08, D5)", () => {
  it("is what is left for goals, the investments and payments come first", async () => {
    await createInvestment(
      db,
      { name: "ETF", icon: "📈", monthly_deposit: kc(3000) },
      0,
    );
    await createRecurring(db, { ...rent, amount: kc(1000) }, "2026-11-01");
    await spend("2026-11-01", 500);
    await createGoal(db, { ...trip, target_amount: kc(1000) });
    await addDeposit(
      db,
      1,
      { date: "2026-11-01", amount: kc(400) },
      "2026-11-01",
    );
    expect((await load("2026-11-02")).freeForGoals).toBe(kc(10100));
  });

  it("free minus remaining contributions equals B − S − P", async () => {
    await createGoal(db, { ...trip, target_amount: kc(1000) });
    await addDeposit(
      db,
      1,
      { date: "2026-11-01", amount: kc(400) },
      "2026-11-01",
    );
    const limit = await load("2026-11-02");
    expect(limit.freeForGoals - kc(600)).toBe(
      limit.budget - limit.spentBefore - limit.reserved,
    );
  });

  it("subtracts deposits of archived goals too", async () => {
    await createGoal(db, trip);
    await addDeposit(
      db,
      1,
      { date: "2026-11-01", amount: kc(400) },
      "2026-11-01",
    );
    await archiveGoal(db, 1, "2026-11-01");
    expect((await load("2026-11-02")).freeForGoals).toBe(kc(14600));
  });
});
