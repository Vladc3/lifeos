import { beforeEach, describe, expect, it } from "vitest";
import {
  archiveGoal,
  createGoal,
  listGoals,
  pauseGoal,
  resumeGoal,
  updateGoal,
  type GoalInput,
} from "./goals";
import { createTestDb, must } from "./testDb";
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
    await updateGoal(db, 2, { ...trip, name: "Auto", target_amount: 5 });
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
