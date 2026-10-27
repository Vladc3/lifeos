import { beforeEach, describe, expect, it } from "vitest";
import {
  createHabit,
  listHabits,
  listLogs,
  setLog,
  type HabitInput,
} from "./habits";
import { createTestDb } from "./testDb";
import type { Db } from "./types";

let db: Db;
beforeEach(() => {
  db = createTestDb();
});

const TODAY = "2026-10-27";

const sleep: HabitInput = {
  name: "Spánek do 23:00",
  icon: "😴",
  identity: "Jsem člověk, který spí",
  type: "check",
  target_value: null,
  unit: null,
  frequency: "daily",
  days_mask: null,
  weekly_target: null,
  anchor: "po čištění zubů",
  min_version: "do 23:30",
  min_value: null,
};

const named = (name: string) => ({ ...sleep, name });

describe("habits repository: create (HAB-01, CALC-06)", () => {
  it("creates a building habit starting today (local date, PRD v0.7 C1)", async () => {
    const id = await createHabit(db, sleep, TODAY);
    expect(typeof id).toBe("number");
    expect(await listHabits(db)).toMatchObject([
      { ...sleep, id, phase: "building", start_date: TODAY, archived_at: null },
    ]);
  });

  it("refuses a 4th active building habit", async () => {
    for (const name of ["A", "B", "C"])
      expect(typeof (await createHabit(db, named(name), TODAY))).toBe("number");
    expect(await createHabit(db, named("D"), TODAY)).toBe("limit");
    expect(await listHabits(db)).toHaveLength(3);
  });

  it("does not count established, paused or archived habits", async () => {
    const [a, b, c] = [
      await createHabit(db, named("A"), TODAY),
      await createHabit(db, named("B"), TODAY),
      await createHabit(db, named("C"), TODAY),
    ];
    await db.execute("UPDATE habits SET phase = 'established' WHERE id = $1", [
      a,
    ]);
    await db.execute(
      "INSERT INTO habit_pauses (habit_id, start_date) VALUES ($1, $2)",
      [b, TODAY],
    );
    await db.execute("UPDATE habits SET archived_at = $1 WHERE id = $2", [
      TODAY,
      c,
    ]);
    for (const name of ["D", "E", "F"])
      expect(typeof (await createHabit(db, named(name), TODAY))).toBe("number");
    expect(await createHabit(db, named("G"), TODAY)).toBe("limit");
  });
});

describe("habits repository: logs (HAB-03)", () => {
  let id: number;
  beforeEach(async () => {
    id = (await createHabit(db, sleep, "2026-10-01")) as number;
  });

  it("writes, overwrites and deletes one log per day", async () => {
    expect(await setLog(db, id, "2026-10-20", "done", null, TODAY)).toBe("ok");
    expect(await setLog(db, id, "2026-10-20", "minimum", null, TODAY)).toBe(
      "ok",
    );
    expect(await listLogs(db)).toEqual([
      { habit_id: id, date: "2026-10-20", status: "minimum", value: null },
    ]);
    expect(await setLog(db, id, "2026-10-20", null, null, TODAY)).toBe("ok");
    expect(await listLogs(db)).toEqual([]);
  });

  it("refuses rest on a past day (CALC-02), allows it today and later", async () => {
    expect(await setLog(db, id, "2026-10-26", "rest", null, TODAY)).toBe(
      "past_rest",
    );
    expect(await setLog(db, id, TODAY, "rest", null, TODAY)).toBe("ok");
    expect(await setLog(db, id, "2026-10-30", "rest", null, TODAY)).toBe("ok");
    expect((await listLogs(db)).map((l) => l.date)).toEqual([
      TODAY,
      "2026-10-30",
    ]);
  });
});
