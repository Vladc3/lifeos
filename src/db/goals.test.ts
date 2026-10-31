import { beforeEach, describe, expect, it } from "vitest";
import {
  addDeposit,
  archiveGoal,
  createGoal,
  deleteDeposit,
  goalSpending,
  listDeposits,
  listGoals,
  pauseGoal,
  reorderGoals,
  resumeGoal,
  updateGoal,
  type GoalInput,
} from "./goals";
import { createRecurring, generateRecurring } from "./recurring";
import { createTestDb, must } from "./testDb";
import { createTransaction } from "./transactions";
import type { Db } from "./types";

let db: Db;
beforeEach(() => {
  db = createTestDb();
});

const trip: GoalInput = {
  type: "saving",
  name: "Dovolená",
  icon: "🏖️",
  target_amount: 3000000,
  target_days: null,
  category_id: null,
  deadline: "2027-04-30",
};

const deposit = (goalId: number, date: string, amount: number) =>
  db.execute(
    "INSERT INTO goal_deposits (goal_id, date, amount) VALUES ($1, $2, $3)",
    [goalId, date, amount],
  );

describe("createGoal (FIN-06)", () => {
  it("adds goals at the end of the priorities", async () => {
    await createGoal(db, trip);
    await createGoal(db, { ...trip, name: "Kolo" });
    expect(
      (await listGoals(db, "2026-10")).map((g) => [g.name, g.priority]),
    ).toEqual([
      ["Dovolená", 1],
      ["Kolo", 2],
    ]);
  });

  it("stores the goal as typed", async () => {
    await createGoal(db, trip);
    expect(must((await listGoals(db, "2026-10"))[0])).toMatchObject({
      ...trip,
      id: 1,
      paused_at: null,
      achieved_at: null,
    });
  });
});

describe("listGoals sums (CALC-08, CALC-07)", () => {
  it("splits deposits into before this month and this month", async () => {
    await createGoal(db, trip);
    await deposit(1, "2026-09-30", 100);
    await deposit(1, "2026-09-01", 200);
    await deposit(1, "2026-10-01", 40);
    await deposit(1, "2026-10-31", 2);
    expect(must((await listGoals(db, "2026-10"))[0])).toMatchObject({
      saved: 300,
      deposited: 42,
    });
  });

  it("is 0 without deposits and counts each goal on its own", async () => {
    await createGoal(db, trip);
    await createGoal(db, trip);
    await deposit(2, "2026-09-01", 5);
    expect(
      (await listGoals(db, "2026-10")).map((g) => [g.saved, g.deposited]),
    ).toEqual([
      [0, 0],
      [5, 0],
    ]);
  });
});

describe("updateGoal (FIN-06)", () => {
  it("changes the goal, not its priority or state", async () => {
    await createGoal(db, trip);
    await createGoal(db, { ...trip, name: "Kolo" });
    await pauseGoal(db, 2, "2026-10-01");
    await updateGoal(
      db,
      2,
      { ...trip, name: "Auto", target_amount: 5 },
      "2026-10-01",
    );
    expect(must((await listGoals(db, "2026-10"))[1])).toMatchObject({
      name: "Auto",
      target_amount: 5,
      priority: 2,
      paused_at: "2026-10-01",
    });
  });
});

describe("pause and archive (FIN-06)", () => {
  it("pauses and resumes", async () => {
    await createGoal(db, trip);
    await pauseGoal(db, 1, "2026-10-01");
    expect(must((await listGoals(db, "2026-10"))[0]).paused_at).toBe(
      "2026-10-01",
    );
    await resumeGoal(db, 1);
    expect(must((await listGoals(db, "2026-10"))[0]).paused_at).toBeNull();
  });

  it("an archived goal leaves the list", async () => {
    await createGoal(db, trip);
    await archiveGoal(db, 1, "2026-10-01");
    expect(await listGoals(db, "2026-10")).toEqual([]);
  });
});

describe("deposits (FIN-07)", () => {
  const small: GoalInput = { ...trip, target_amount: 1000 };
  const achievedAt = async () =>
    must((await listGoals(db, "2026-10"))[0]).achieved_at;

  it("lists the deposits of one goal, newest first", async () => {
    await createGoal(db, small);
    await createGoal(db, small);
    await addDeposit(db, 1, { date: "2026-09-01", amount: 100 }, "2026-10-01");
    await addDeposit(db, 1, { date: "2026-10-01", amount: 200 }, "2026-10-01");
    await addDeposit(db, 2, { date: "2026-10-01", amount: 300 }, "2026-10-01");
    expect(await listDeposits(db, 1)).toEqual([
      { id: 2, date: "2026-10-01", amount: 200 },
      { id: 1, date: "2026-09-01", amount: 100 },
    ]);
  });

  it("a deposit is not a transaction", async () => {
    await createGoal(db, small);
    await addDeposit(db, 1, { date: "2026-10-01", amount: 100 }, "2026-10-01");
    expect(await db.select("SELECT id FROM transactions")).toEqual([]);
  });

  it("a deposit this month reaches the goal at once (D4)", async () => {
    await createGoal(db, small);
    await addDeposit(db, 1, { date: "2026-10-05", amount: 999 }, "2026-10-05");
    expect(await achievedAt()).toBeNull();
    await addDeposit(db, 1, { date: "2026-10-06", amount: 1 }, "2026-10-06");
    expect(await achievedAt()).toBe("2026-10-06");
  });

  it("keeps the first achieved date on a later deposit", async () => {
    await createGoal(db, small);
    await addDeposit(db, 1, { date: "2026-10-05", amount: 1000 }, "2026-10-05");
    await addDeposit(db, 1, { date: "2026-10-06", amount: 5 }, "2026-10-06");
    expect(await achievedAt()).toBe("2026-10-05");
  });

  it("deleting a deposit can cancel the achievement", async () => {
    await createGoal(db, small);
    await addDeposit(db, 1, { date: "2026-10-05", amount: 1000 }, "2026-10-05");
    await deleteDeposit(db, 1, 1, "2026-10-06");
    expect(await achievedAt()).toBeNull();
  });

  it("raising the target cancels it, lowering reaches it", async () => {
    await createGoal(db, small);
    await addDeposit(db, 1, { date: "2026-10-05", amount: 1000 }, "2026-10-05");
    await updateGoal(db, 1, { ...small, target_amount: 2000 }, "2026-10-06");
    expect(await achievedAt()).toBeNull();
    await updateGoal(db, 1, { ...small, target_amount: 900 }, "2026-10-07");
    expect(await achievedAt()).toBe("2026-10-07");
  });

  it("uses local today from the caller, not the DB clock", async () => {
    await createGoal(db, small);
    await addDeposit(db, 1, { date: "2020-01-01", amount: 1000 }, "2020-01-02");
    expect(await achievedAt()).toBe("2020-01-02");
  });

  it("deleting a deposit keeps the others", async () => {
    await createGoal(db, small);
    await createGoal(db, small);
    await addDeposit(db, 1, { date: "2026-10-05", amount: 100 }, "2026-10-05");
    await addDeposit(db, 1, { date: "2026-10-06", amount: 200 }, "2026-10-06");
    await addDeposit(db, 2, { date: "2026-10-07", amount: 300 }, "2026-10-07");
    await deleteDeposit(db, 1, 1, "2026-10-08");
    expect((await listDeposits(db, 1)).map((d) => d.amount)).toEqual([200]);
    expect((await listDeposits(db, 2)).map((d) => d.amount)).toEqual([300]);
  });

  it("counts only the goal's own deposits", async () => {
    await createGoal(db, { ...small, target_amount: 5000 });
    await createGoal(db, small);
    await addDeposit(db, 1, { date: "2026-10-05", amount: 4000 }, "2026-10-05");
    await addDeposit(db, 2, { date: "2026-10-05", amount: 1 }, "2026-10-05");
    expect(must((await listGoals(db, "2026-10"))[1]).achieved_at).toBeNull();
  });

  it("a deposit changes the state of that goal only", async () => {
    await createGoal(db, small);
    await createGoal(db, small);
    await deposit(1, "2026-10-05", 1000); // raw: goal 1 was not synced
    await addDeposit(db, 2, { date: "2026-10-05", amount: 1 }, "2026-10-05");
    expect(await achievedAt()).toBeNull();
  });

  it("leaves the other goals alone", async () => {
    await createGoal(db, small);
    await createGoal(db, small);
    await addDeposit(db, 2, { date: "2026-10-05", amount: 1000 }, "2026-10-05");
    expect(await achievedAt()).toBeNull();
  });
});

describe("reorderGoals (FIN-08)", () => {
  it("stores the new order", async () => {
    await createGoal(db, trip);
    await createGoal(db, { ...trip, name: "Kolo" });
    await createGoal(db, { ...trip, name: "Auto" });
    await reorderGoals(db, [3, 1, 2]);
    expect((await listGoals(db, "2026-10")).map((g) => g.name)).toEqual([
      "Auto",
      "Dovolená",
      "Kolo",
    ]);
  });

  it("a new goal goes after all of them", async () => {
    await createGoal(db, trip);
    await createGoal(db, trip);
    await reorderGoals(db, [2, 1]);
    await createGoal(db, { ...trip, name: "Nový" });
    expect(must((await listGoals(db, "2026-10"))[2]).name).toBe("Nový");
  });

  it("leaves goals outside the list alone", async () => {
    await createGoal(db, trip);
    await createGoal(db, trip);
    await reorderGoals(db, [1]);
    expect((await listGoals(db, "2026-10")).map((g) => g.priority)).toEqual([
      1, 2,
    ]);
  });
});

describe("goalSpending (CALC-09, CALC-10)", () => {
  const spend = (date: string, amount: number, category_id = 1) =>
    createTransaction(db, { date, amount, category_id, note: null });

  it("sums expenses per category in the month", async () => {
    await spend("2026-10-01", 100);
    await spend("2026-10-31", 20);
    await spend("2026-09-30", 7);
    await spend("2026-10-02", 5, 2);
    await spend("2026-10-02", 900, 11); // income
    expect((await goalSpending(db, "2026-10")).byCategory).toEqual({
      1: 120,
      2: 5,
    });
  });

  it("no-spend days ignore recurring payments and income", async () => {
    await createRecurring(
      db,
      { name: "Nájem", amount: 100, category_id: 1, day_of_month: 5 },
      "2026-10-01",
    );
    await generateRecurring(db, "2026-10-31");
    await spend("2026-10-06", 100);
    await spend("2026-10-07", 900, 11);
    expect((await goalSpending(db, "2026-10")).spendDates).toEqual([
      "2026-10-06",
    ]);
  });
});
