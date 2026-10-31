import { describe, expect, it } from "vitest";
import {
  DEMO_LIMITS,
  demoGoals,
  demoHabits,
  demoRecurring,
  demoTransactions,
  devDbPath,
} from "./demo";
import { habitStreak, reachesEstablished } from "./habits";

describe("devDbPath (PUB-03, PUB-04: demo jen do dev DB)", () => {
  const dev = "io.github.vladc3.lifeos.dev";

  it("uses ~/.config on Linux, like Tauri's app_config_dir", () => {
    expect(devDbPath("linux", { HOME: "/home/v" }, dev)).toBe(
      "/home/v/.config/io.github.vladc3.lifeos.dev/life-os.db",
    );
  });

  it("respects XDG_CONFIG_HOME on Linux", () => {
    expect(
      devDbPath("linux", { HOME: "/home/v", XDG_CONFIG_HOME: "/cfg" }, dev),
    ).toBe("/cfg/io.github.vladc3.lifeos.dev/life-os.db");
  });

  it("uses %APPDATA% on Windows", () => {
    expect(
      devDbPath("win32", { APPDATA: "C:\\Users\\v\\AppData\\Roaming" }, dev),
    ).toBe(
      "C:\\Users\\v\\AppData\\Roaming\\io.github.vladc3.lifeos.dev\\life-os.db",
    );
  });

  it("refuses the real (release) identifier", () => {
    expect(() =>
      devDbPath("linux", { HOME: "/home/v" }, "io.github.vladc3.lifeos"),
    ).toThrow(/\.dev/);
  });

  it("refuses an unknown platform or missing home", () => {
    expect(() => devDbPath("darwin", { HOME: "/Users/v" }, dev)).toThrow();
    expect(() => devDbPath("linux", {}, dev)).toThrow();
  });
});

describe("demoTransactions (PUB-04)", () => {
  const categories = [
    { id: 1, name: "Jídlo", kind: "expense" as const },
    { id: 2, name: "Jídlo venku", kind: "expense" as const },
    { id: 3, name: "Doprava", kind: "expense" as const },
    { id: 7, name: "Zábava", kind: "expense" as const },
    { id: 11, name: "Práce / zakázky", kind: "income" as const },
  ];
  const today = "2026-10-26";
  const txs = demoTransactions(today, categories);

  it("is deterministic, so screenshots stay the same", () => {
    expect(demoTransactions(today, categories)).toEqual(txs);
  });

  it("covers the last 3 months up to today, never the future", () => {
    const dates = txs.map((t) => t.date).sort();
    expect(dates[0] >= "2026-08-01").toBe(true);
    expect(dates[dates.length - 1] <= today).toBe(true);
    expect(new Set(dates.map((d) => d.slice(0, 7)))).toEqual(
      new Set(["2026-08", "2026-09", "2026-10"]),
    );
  });

  it("uses only the given categories, with positive whole haléře", () => {
    const ids = new Set(categories.map((c) => c.id));
    for (const t of txs) {
      expect(ids.has(t.category_id)).toBe(true);
      expect(Number.isSafeInteger(t.amount) && t.amount > 0).toBe(true);
    }
    expect(txs.some((t) => t.category_id === 11)).toBe(true); // income too
  });

  it("works across a year boundary", () => {
    const january = demoTransactions("2027-01-05", categories);
    expect(january.some((t) => t.date.startsWith("2026-11"))).toBe(true);
    expect(january.every((t) => t.date <= "2027-01-05")).toBe(true);
  });

  it("sets limits only on expense categories", () => {
    for (const name of Object.keys(DEMO_LIMITS))
      expect(["Jídlo", "Jídlo venku", "Doprava", "Zábava"]).toContain(name);
  });
});

describe("demoHabits (PUB-04, plan F3 E10 and K table)", () => {
  const today = "2026-10-27"; // Tuesday
  const demo = demoHabits(today);
  const byName = (name: string) => {
    const found = demo.find((d) => d.habit.name === name);
    if (!found) throw new Error(`missing demo habit ${name}`);
    return found;
  };

  it("has 4 habits, at most 3 building (CALC-06)", () => {
    expect(demo.map((d) => d.habit.name)).toEqual([
      "Čtení",
      "Trénink",
      "Spánek do 23:00",
      "Učení",
    ]);
    expect(demo.filter((d) => d.habit.phase === "building")).toHaveLength(3);
  });

  it("Čtení: started 30 days ago, all done up to yesterday → streak 30", () => {
    const { habit, logs } = byName("Čtení");
    expect(habit.start_date).toBe("2026-09-27");
    expect(habitStreak(habit, [], logs, today)).toEqual({
      streak: 30,
      atRisk: false,
    });
  });

  it("Spánek: missed yesterday → at risk with the streak kept", () => {
    const { habit, logs } = byName("Spánek do 23:00");
    expect(habitStreak(habit, [], logs, today).atRisk).toBe(true);
    expect(habitStreak(habit, [], logs, today).streak).toBeGreaterThan(0);
  });

  it("Učení: building, but reaches established on the next sync (K9)", () => {
    const { habit, logs } = byName("Učení");
    expect(habit.phase).toBe("building");
    expect(reachesEstablished(habit, [], logs, today)).toBe(true);
  });

  it("Trénink: established weekly habit with a running streak in weeks", () => {
    const { habit, logs } = byName("Trénink");
    expect(habit.phase).toBe("established");
    expect(habitStreak(habit, [], logs, today).streak).toBeGreaterThanOrEqual(
      11,
    );
  });

  it("no log is in the future and every log is valid for its habit", () => {
    for (const { habit, logs } of demo)
      for (const log of logs) {
        expect(log.date <= today, habit.name).toBe(true);
        expect(log.date >= habit.start_date, habit.name).toBe(true);
      }
  });
});

describe("demoHabits gives the K-table numbers on every weekday (dev-team QA)", () => {
  it.each([
    "2026-10-26",
    "2026-10-27",
    "2026-10-28",
    "2026-10-29",
    "2026-10-30",
    "2026-10-31",
    "2026-11-01",
  ])("%s", (today) => {
    const streaks = Object.fromEntries(
      demoHabits(today).map(({ habit, logs }) => [
        habit.name,
        habitStreak(habit, [], logs, today),
      ]),
    );
    expect(streaks).toEqual({
      Čtení: { streak: 30, atRisk: false },
      Trénink: { streak: 12, atRisk: false }, // this week empty, still open
      "Spánek do 23:00": { streak: 19, atRisk: true },
      Učení: expect.any(Object),
    });
    const study = demoHabits(today).find((d) => d.habit.name === "Učení");
    expect(
      study && reachesEstablished(study.habit, [], study.logs, today),
    ).toBe(true);
  });
});

describe("demoRecurring (PUB-04, plan F4, E13)", () => {
  const categories = [
    { id: 1, name: "Jídlo", kind: "expense" as const },
    { id: 8, name: "Předplatné", kind: "expense" as const },
  ];

  it("has Předplatné on day 5, founded two months ago", () => {
    expect(demoRecurring("2026-10-26", categories)).toEqual([
      {
        name: "Předplatné",
        amount: 25900,
        category_id: 8,
        day_of_month: 5,
        first_month: "2026-08",
      },
    ]);
  });

  it("crosses the year", () => {
    expect(demoRecurring("2027-01-10", categories)[0].first_month).toBe(
      "2026-11",
    );
  });

  it("skips a missing category", () => {
    expect(demoRecurring("2026-10-26", [categories[0]])).toEqual([]);
  });

  it("the old Předplatné rule is gone, the app generates it now", () => {
    const ids = [...categories];
    expect(
      demoTransactions("2026-10-26", ids).filter((t) => t.category_id === 8),
    ).toEqual([]);
  });
});

describe("demoGoals (PUB-04, plan F4, kontrolní seznam)", () => {
  it("has Dovolená with a deadline that never overflows on the 31st", () => {
    expect(demoGoals("2026-10-31")[0]).toMatchObject({
      type: "saving",
      name: "Dovolená",
      target_amount: 3000000,
      deadline: "2027-04-01",
      priority: 1,
      deposits: [{ date: "2026-09-01", amount: 500000 }],
    });
  });

  it("has an overdue goal for K5", () => {
    expect(demoGoals("2026-10-31")[1]).toMatchObject({
      name: "Kurz",
      target_amount: 200000,
      deadline: "2026-09-01",
      priority: 2,
      deposits: [{ date: "2026-09-01", amount: 150000 }],
    });
  });

  it("crosses the year", () => {
    expect(demoGoals("2027-01-15")[0]).toMatchObject({
      deadline: "2027-07-01",
      deposits: [{ date: "2026-12-01" }],
    });
  });
});
