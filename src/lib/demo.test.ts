import { describe, expect, it } from "vitest";
import { DEMO_LIMITS, demoTransactions, devDbPath } from "./demo";

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
