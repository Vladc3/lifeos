import { describe, expect, it } from "vitest";
import { addDays } from "./dates";
import {
  consistency,
  dayStatuses,
  establishGap,
  nearestToEstablish,
  reachesEstablished,
  habitStreak,
  isScheduled,
  nextCellStatus,
  statusForValue,
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

describe("statusForValue (CALC-02, called only when a log is written)", () => {
  it.each([
    [10, 10, 1, "done"], // value = target
    [12, 10, 1, "done"],
    [7, 10, 1, "minimum"],
    [1, 10, 1, "minimum"], // value = min
    [5, 10, null, "missed"], // below target and no minimum
    [0, 10, 1, "missed"],
  ] as const)("%d of %d (min %s) → %s", (value, target, min, status) => {
    expect(statusForValue(value, target, min)).toBe(status);
  });
});

describe("consistency (CALC-04)", () => {
  const start = "2026-10-16"; // 10 days before TODAY
  it("successes ÷ scheduled days up to yesterday, rest not counted, rounded", () => {
    // 16..25: d d x d r d x d d m  → 7 successes of 9 non-rest days = 78 %
    const logs10 = logs(start, "ddxdrdxddm");
    expect(consistency(daily(start), [], logs10, start, TODAY, TODAY)).toBe(78);
  });

  it("counts today only once it is a success", () => {
    const l = logs(start, "dddddddddd");
    expect(consistency(daily(start), [], l, start, TODAY, TODAY)).toBe(100);
    const withToday = logs(start, "ddddddddxxd"); // 8 of 10 days + today done
    expect(consistency(daily(start), [], withToday, start, TODAY, TODAY)).toBe(
      82, // 9 of 11
    );
  });

  it("is null without any scheduled day (shown as –)", () => {
    expect(consistency(daily(TODAY), [], [], TODAY, TODAY, TODAY)).toBeNull();
  });
});

describe("reachesEstablished (CALC-05, one-way)", () => {
  // n days since start, last 66 days with `misses` scheduled misses
  const habitWith = (daysSinceStart: number, misses: number) => {
    const start = addDays(TODAY, -daysSinceStart);
    const pattern = "d".repeat(daysSinceStart - misses) + "x".repeat(misses);
    return reachesEstablished(daily(start), [], logs(start, pattern), TODAY);
  };

  it("needs 66 days since start", () => {
    expect(habitWith(65, 0)).toBe(false);
    expect(habitWith(66, 0)).toBe(true);
  });

  it("needs consistency ≥ 80 % over the last 66 days", () => {
    // window = TODAY-65 .. TODAY (today pending, not counted): 65 days
    expect(habitWith(70, 13)).toBe(true); // 52 / 65 = 80 %
    expect(habitWith(70, 14)).toBe(false); // 51 / 65 = 78 %
  });
});

describe("establishGap (HAB-05)", () => {
  it("days until 66 days since start, never below 0", () => {
    expect(establishGap(daily(addDays(TODAY, -60)), TODAY)).toBe(6);
    expect(establishGap(daily(addDays(TODAY, -80)), TODAY)).toBe(0);
  });
});

describe("nearestToEstablish (HAB-05 hláška, PRD v0.7 P7)", () => {
  it("picks the building habit with the fewest days left", () => {
    expect(
      nearestToEstablish(
        [
          { ...daily(addDays(TODAY, -40)), name: "Čtení" },
          { ...daily(addDays(TODAY, -60)), name: "Spánek" },
        ],
        TODAY,
      ),
    ).toEqual({ name: "Spánek", days: 6 });
  });

  it("days 0 means only the 80 % consistency is missing", () => {
    expect(
      nearestToEstablish([{ ...daily(addDays(TODAY, -90)), name: "X" }], TODAY),
    ).toEqual({ name: "X", days: 0 });
  });

  it("is null without building habits", () => {
    expect(nearestToEstablish([], TODAY)).toBeNull();
  });
});
