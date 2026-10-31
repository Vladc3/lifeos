import { beforeEach, describe, expect, it } from "vitest";
import { addDays } from "../lib/dates";
import {
  archiveHabit,
  createHabit,
  listHabits,
  listLogs,
  listPauses,
  pauseHabit,
  restoreHabit,
  resumeHabit,
  setLog,
  syncPhases,
  updateHabit,
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

describe("habits repository: lifecycle (HAB-02, CALC-06)", () => {
  const ids = async () => [
    (await createHabit(db, named("A"), "2026-10-01")) as number,
    (await createHabit(db, named("B"), "2026-10-01")) as number,
    (await createHabit(db, named("C"), "2026-10-01")) as number,
  ];

  it("updates a habit but never its type (PRD v0.7, C6)", async () => {
    const [a] = await ids();
    // The form locks the type; even if another type came in, it is ignored.
    await updateHabit(db, a, {
      ...named("A2"),
      type: "count",
    });
    expect((await listHabits(db))[0]).toMatchObject({
      name: "A2",
      type: "check",
      target_value: null,
    });
  });

  it("pauses from today and resumes with the pause ending yesterday", async () => {
    const [a] = await ids();
    await pauseHabit(db, a, "2026-10-20");
    expect(await resumeHabit(db, a, TODAY)).toBe("ok");
    expect(await listPauses(db)).toEqual([
      { habit_id: a, start_date: "2026-10-20", end_date: "2026-10-26" },
    ]);
  });

  it("a pause resumed the same day leaves no pause behind", async () => {
    const [a] = await ids();
    await pauseHabit(db, a, TODAY);
    expect(await resumeHabit(db, a, TODAY)).toBe("ok");
    expect(await listPauses(db)).toEqual([]);
  });

  it("resuming or restoring a 4th building habit is refused", async () => {
    const [a, b] = await ids();
    await pauseHabit(db, a, "2026-10-20");
    await archiveHabit(db, b, "2026-10-21");
    await createHabit(db, named("D"), TODAY);
    await createHabit(db, named("E"), TODAY); // C, D, E building
    expect(await resumeHabit(db, a, TODAY)).toBe("limit");
    expect(await restoreHabit(db, b, TODAY)).toBe("limit");
    expect((await listPauses(db))[0].end_date).toBeNull();
    expect((await listHabits(db)).find((h) => h.id === b)?.archived_at).toBe(
      "2026-10-21",
    );
  });

  it("an established habit can always come back", async () => {
    const [a] = await ids();
    await db.execute("UPDATE habits SET phase = 'established' WHERE id = $1", [
      a,
    ]);
    await archiveHabit(db, a, TODAY);
    await createHabit(db, named("D"), TODAY);
    expect(await restoreHabit(db, a, TODAY)).toBe("ok");
  });

  it("archiving keeps the logs (HAB-02)", async () => {
    const [a] = await ids();
    await setLog(db, a, "2026-10-20", "done", null, TODAY);
    await archiveHabit(db, a, TODAY);
    expect(await listLogs(db)).toHaveLength(1);
  });
});

describe("syncPhases (CALC-05, HAB-06)", () => {
  it("stores established once, returns only habits that just changed", async () => {
    const start = "2026-08-01";
    const id = (await createHabit(db, named("Učení"), start)) as number;
    for (let d = start; d < TODAY; d = addDays(d, 1))
      await setLog(db, id, d, "done", null, TODAY);
    await createHabit(db, named("Nový"), TODAY);

    expect(await syncPhases(db, TODAY)).toEqual(["Učení"]);
    expect((await listHabits(db)).map((h) => h.phase)).toEqual([
      "established",
      "building",
    ]);
    expect(await syncPhases(db, TODAY)).toEqual([]); // one-way, said once
  });
});

describe("archive keeps the archived days out of the streak (dev-team review)", () => {
  it("archived days are not missed after restore; restore resumes", async () => {
    const id = (await createHabit(db, named("Čtení"), "2026-10-01")) as number;
    for (let d = "2026-10-01"; d <= "2026-10-10"; d = addDays(d, 1))
      await setLog(db, id, d, "done", null, TODAY);
    await archiveHabit(db, id, "2026-10-11");
    expect(await restoreHabit(db, id, "2026-10-21")).toBe("ok");
    // archived 11..20 = a pause, restore ends it yesterday
    expect(await listPauses(db)).toEqual([
      { habit_id: id, start_date: "2026-10-11", end_date: "2026-10-20" },
    ]);
  });

  it("resuming a habit that is not paused is just ok", async () => {
    const id = (await createHabit(db, named("Čtení"), "2026-10-01")) as number;
    expect(await resumeHabit(db, id, TODAY)).toBe("ok");
  });
});
