import { describe, expect, it } from "vitest";
import { addDays } from "./dates";
import {
  dayStatuses,
  habitStreak,
  isScheduled,
  nextCellStatus,
  type HabitRule,
  type HabitLog,
  type Pause,
} from "./habits";

const TODAY = "2026-10-26"; // Monday

const daily = (start_date: string): HabitRule => ({
  frequency: "daily",
  days_mask: null,
  weekly_target: null,
  start_date,
});

// One char per day from `start`: d done, m minimum, r rest, x nothing logged.
function logs(start: string, pattern: string): HabitLog[] {
  const status = { d: "done", m: "minimum", r: "rest" } as const;
  return [...pattern].flatMap((c, i) =>
    c in status
      ? [
          {
            date: addDays(start, i),
            status: status[c as keyof typeof status],
            value: null,
          },
        ]
      : [],
  );
}

// Pattern for the days that end yesterday; today has no log unless given.
function streakOf(pattern: string, todayLog = "", pauses: Pause[] = []) {
  const start = addDays(TODAY, -pattern.length);
  return habitStreak(
    daily(start),
    pauses,
    logs(start, pattern + todayLog),
    TODAY,
  );
}

describe("isScheduled (CALC-01)", () => {
  it("daily: every day from start_date, not before", () => {
    const habit = daily("2026-10-10");
    expect(isScheduled(habit, [], "2026-10-09")).toBe(false);
    expect(isScheduled(habit, [], "2026-10-10")).toBe(true);
    expect(isScheduled(habit, [], "2026-10-11")).toBe(true);
  });

  it("days: only weekdays in days_mask (bit 0 = Monday)", () => {
    const habit: HabitRule = {
      ...daily("2026-10-01"),
      frequency: "days",
      days_mask: 0b0000101, // Monday, Wednesday
    };
    expect(isScheduled(habit, [], "2026-10-26")).toBe(true); // Mon
    expect(isScheduled(habit, [], "2026-10-27")).toBe(false); // Tue
    expect(isScheduled(habit, [], "2026-10-28")).toBe(true); // Wed
    expect(isScheduled(habit, [], "2026-11-01")).toBe(false); // Sun
  });

  it("not in a pause (inclusive), nor after an open pause began", () => {
    const habit = daily("2026-10-01");
    const closed = [{ start_date: "2026-10-10", end_date: "2026-10-12" }];
    expect(isScheduled(habit, closed, "2026-10-09")).toBe(true);
    expect(isScheduled(habit, closed, "2026-10-10")).toBe(false);
    expect(isScheduled(habit, closed, "2026-10-12")).toBe(false);
    expect(isScheduled(habit, closed, "2026-10-13")).toBe(true);
    const open = [{ start_date: "2026-10-20", end_date: null }];
    expect(isScheduled(habit, open, "2026-10-19")).toBe(true);
    expect(isScheduled(habit, open, "2026-12-31")).toBe(false);
  });

  it("weekly_count has no scheduled days (evaluated by weeks)", () => {
    const habit: HabitRule = {
      ...daily("2026-10-01"),
      frequency: "weekly_count",
      weekly_target: 3,
    };
    expect(isScheduled(habit, [], "2026-10-26")).toBe(false);
  });
});

describe("dayStatuses (CALC-02, the single source of day states)", () => {
  const habit = daily("2026-10-20");
  const statuses = dayStatuses(
    habit,
    [],
    [
      { date: "2026-10-21", status: "done", value: null },
      { date: "2026-10-22", status: "minimum", value: null },
      { date: "2026-10-23", status: "rest", value: null },
      { date: "2026-10-28", status: "rest", value: null },
      { date: "2026-10-19", status: "done", value: null }, // before start
    ],
    "2026-10-19",
    "2026-10-29",
    TODAY,
  );

  it("maps every day of the range", () => {
    expect([...statuses.entries()]).toEqual([
      ["2026-10-19", "unscheduled"],
      ["2026-10-20", "missed"], // past, no log
      ["2026-10-21", "done"],
      ["2026-10-22", "minimum"],
      ["2026-10-23", "rest"],
      ["2026-10-24", "missed"],
      ["2026-10-25", "missed"],
      ["2026-10-26", "pending"], // today, no log
      ["2026-10-27", "pending"], // future
      ["2026-10-28", "rest"],
      ["2026-10-29", "pending"],
    ]);
  });

  it("today: success when logged, otherwise pending (a stored miss too)", () => {
    const today = (status: HabitLog["status"]) =>
      dayStatuses(
        habit,
        [],
        [{ date: TODAY, status, value: null }],
        TODAY,
        TODAY,
        TODAY,
      ).get(TODAY);
    expect(today("done")).toBe("done");
    expect(today("rest")).toBe("rest");
    expect(today("missed")).toBe("pending");
  });
});

describe("habitStreak (CALC-02, CALC-03 nikdy dvakrát)", () => {
  it.each([
    ["ddxd", 3, false], // PRD: ✓ ✓ ✗ ✓ = 3
    ["ddxx", 0, false], // PRD: ✓ ✓ ✗ ✗ = 0
    ["dxxdd", 2, false],
    ["xrx", 0, false], // rest between misses does not save the streak
    ["drd", 2, false], // rest neither breaks nor adds
    ["mm", 2, false], // minimum is a success
    ["dddx", 3, true], // one miss: streak kept, at risk
    ["", 0, false], // started today
  ])("%j, today pending → %d, at risk %s", (pattern, streak, atRisk) => {
    expect(streakOf(pattern)).toEqual({ streak, atRisk });
  });

  it("counts today once it is a success", () => {
    expect(streakOf("ddd", "d")).toEqual({ streak: 4, atRisk: false });
    expect(streakOf("ddx", "d")).toEqual({ streak: 3, atRisk: false });
  });

  it("skips unscheduled days between two misses: still two in a row = 0", () => {
    // Mon/Wed/Fri habit; misses on Fri 23 and Mon 26 with the weekend between
    const habit: HabitRule = {
      ...daily("2026-10-19"),
      frequency: "days",
      days_mask: 0b0010101,
    };
    const result = habitStreak(
      habit,
      [],
      logs("2026-10-19", "d.d"), // Mon 19, Wed 21 done; Fri 23 missed
      "2026-10-27", // Tue: Mon 26 missed too
    );
    expect(result).toEqual({ streak: 0, atRisk: false });
  });

  it("a pause between two misses does not separate them", () => {
    const start = addDays(TODAY, -6);
    const pause = [
      { start_date: addDays(TODAY, -3), end_date: addDays(TODAY, -2) },
    ];
    // days -6..-1: d d x [pause pause] x
    const result = habitStreak(daily(start), pause, logs(start, "ddx"), TODAY);
    expect(result).toEqual({ streak: 0, atRisk: false });
  });

  it("a pause keeps the streak as it was (HAB-02)", () => {
    const start = addDays(TODAY, -5);
    const pause = [{ start_date: addDays(TODAY, -2), end_date: null }];
    expect(habitStreak(daily(start), pause, logs(start, "ddd"), TODAY)).toEqual(
      { streak: 3, atRisk: false },
    );
  });
});

describe("nextCellStatus (HAB-03 cyklus kliku, PRD v0.7)", () => {
  const cycle = (
    when: "past" | "today" | "future",
    hasMinimum: boolean,
    weekly = false,
  ) => {
    const seen: (HabitLog["status"] | null)[] = [null];
    for (let i = 0; i < 5; i++)
      seen.push(
        nextCellStatus(seen[seen.length - 1], when, hasMinimum, weekly),
      );
    return seen.slice(0, seen.indexOf(null, 1) + 1);
  };

  it("past day: empty (= missed) → done → minimum → empty, never rest", () => {
    expect(cycle("past", true)).toEqual([null, "done", "minimum", null]);
    expect(cycle("past", false)).toEqual([null, "done", null]);
  });

  it("today adds rest", () => {
    expect(cycle("today", true)).toEqual([
      null,
      "done",
      "minimum",
      "rest",
      null,
    ]);
    expect(cycle("today", false)).toEqual([null, "done", "rest", null]);
  });

  it("future day: only rest ↔ empty", () => {
    expect(cycle("future", true)).toEqual([null, "rest", null]);
  });

  it("weekly_count has no rest", () => {
    expect(cycle("today", true, true)).toEqual([null, "done", "minimum", null]);
    expect(nextCellStatus(null, "future", true, true)).toBeNull();
  });

  it("an old stored rest on a past day goes back to empty", () => {
    expect(nextCellStatus("rest", "past", true)).toBeNull();
    expect(nextCellStatus("missed", "past", true)).toBe("done");
  });
});
