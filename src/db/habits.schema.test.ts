import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "./testDb";
import type { Db } from "./types";

// Plan F3, E1: the DB rejects habits that break HAB-01 or CALC-01 data rules.
let db: Db;
// node:sqlite wording; the app (sqlx) words errors differently, so only tests match on it.
const CONSTRAINT = /constraint failed/;
beforeEach(() => {
  db = createTestDb();
});

const reading = {
  name: "Čtení",
  icon: "📖",
  type: "count",
  target_value: 10,
  unit: "stran",
  frequency: "daily",
  days_mask: null,
  weekly_target: null,
  min_value: 1,
  start_date: "2026-10-01",
};

const addHabit = (overrides: Partial<typeof reading> = {}) => {
  const h = { ...reading, ...overrides };
  return db.execute(
    `INSERT INTO habits (name, icon, type, target_value, unit, frequency, days_mask, weekly_target, min_value, start_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      h.name,
      h.icon,
      h.type,
      h.target_value,
      h.unit,
      h.frequency,
      h.days_mask,
      h.weekly_target,
      h.min_value,
      h.start_date,
    ],
  );
};

describe("habits constraints (HAB-01)", () => {
  it("accepts valid habits of every type and frequency, building by default", async () => {
    await addHabit();
    await addHabit({
      name: "Spánek",
      type: "check",
      target_value: null as unknown as number,
      unit: null as unknown as string,
      min_value: null as unknown as number,
    });
    await addHabit({
      name: "Učení",
      type: "duration",
      target_value: 90,
      min_value: 15,
      frequency: "days",
      days_mask: 0b0001111 as unknown as null,
    });
    await addHabit({
      name: "Trénink",
      frequency: "weekly_count",
      weekly_target: 4 as unknown as null,
    });
    expect(
      await db.select<{ phase: string }[]>("SELECT DISTINCT phase FROM habits"),
    ).toEqual([{ phase: "building" }]);
  });

  it.each([
    ["empty name", { name: "" }],
    ["name over 40 chars", { name: "x".repeat(41) }],
    ["unknown type", { type: "yesno" }],
    ["count without target", { target_value: null as unknown as number }],
    ["target 0", { target_value: 0 }],
    ["min equal to target", { min_value: 10 }],
    ["min 0", { min_value: 0 }],
    [
      "target on a check habit",
      { type: "check", min_value: null as unknown as number },
    ],
    ["days without mask", { frequency: "days" }],
    ["mask on daily", { days_mask: 3 as unknown as null }],
    ["mask 0", { frequency: "days", days_mask: 0 as unknown as null }],
    ["mask 128", { frequency: "days", days_mask: 128 as unknown as null }],
    ["weekly without target", { frequency: "weekly_count" }],
    [
      "weekly target 8",
      { frequency: "weekly_count", weekly_target: 8 as unknown as null },
    ],
    ["bad start date", { start_date: "2026-02-30" }],
  ])("rejects %s", async (_label, overrides) => {
    await expect(addHabit(overrides)).rejects.toThrow(CONSTRAINT);
  });
});

describe("habit_pauses and habit_logs constraints", () => {
  beforeEach(async () => {
    await addHabit();
  });

  const pause = (start: string, end: string | null) =>
    db.execute(
      "INSERT INTO habit_pauses (habit_id, start_date, end_date) VALUES (1, $1, $2)",
      [start, end],
    );
  const log = (date: string, status: string, value: number | null = null) =>
    db.execute(
      "INSERT INTO habit_logs (habit_id, date, status, value) VALUES (1, $1, $2, $3)",
      [date, status, value],
    );

  it("accepts closed pauses and one open pause", async () => {
    await pause("2026-10-05", "2026-10-07");
    await pause("2026-10-20", null);
  });

  it("rejects a pause ending before it starts and a second open pause", async () => {
    await expect(pause("2026-10-07", "2026-10-05")).rejects.toThrow(CONSTRAINT);
    await pause("2026-10-20", null);
    await expect(pause("2026-10-25", null)).rejects.toThrow(CONSTRAINT);
  });

  it("accepts one log per habit and day", async () => {
    await log("2026-10-10", "done", 10);
    await expect(log("2026-10-10", "minimum", 1)).rejects.toThrow(CONSTRAINT);
  });

  it.each([
    ["unknown status", "2026-10-10", "skipped", null],
    ["bad date", "10.10.2026", "done", null],
    ["negative value", "2026-10-10", "done", -1],
  ])("rejects a log with %s", async (_label, date, status, value) => {
    await expect(log(date, status, value)).rejects.toThrow(CONSTRAINT);
  });

  it("rejects a log of a habit that does not exist", async () => {
    await expect(
      db.execute(
        "INSERT INTO habit_logs (habit_id, date, status) VALUES (99, '2026-10-10', 'done')",
      ),
    ).rejects.toThrow(CONSTRAINT);
  });
});
