import { beforeEach, describe, expect, it } from "vitest";
import { getSetting, setSetting } from "./settings";
import { createTestDb } from "./testDb";
import type { Db } from "./types";

let db: Db;
beforeEach(() => {
  db = createTestDb();
});

describe("settings repository", () => {
  it("returns null for a key that was never set", async () => {
    expect(await getSetting(db, "onboarding_done")).toBeNull();
  });

  it("returns the value that was set", async () => {
    await setSetting(db, "onboarding_done", "1");
    expect(await getSetting(db, "onboarding_done")).toBe("1");
  });

  it("overwrites an existing key instead of adding a second row", async () => {
    await setSetting(db, "monthly_budget", "600000");
    await setSetting(db, "monthly_budget", "700000");
    expect(await getSetting(db, "monthly_budget")).toBe("700000");
    expect(
      await db.select<{ n: number }[]>("SELECT count(*) AS n FROM settings"),
    ).toEqual([{ n: 1 }]);
  });

  it("stores quotes and SQL-looking text verbatim (parametrized SQL, NFR-07)", async () => {
    const nasty = "it's'; DROP TABLE settings; --";
    await setSetting(db, "note", nasty);
    expect(await getSetting(db, "note")).toBe(nasty);
    expect(await getSetting(db, "missing")).toBeNull(); // table still exists
  });
});

describe("test DB parity with plugin-sql (sqlx)", () => {
  it("has foreign keys enabled, like sqlx by default", async () => {
    expect(
      await db.select<{ foreign_keys: number }[]>("PRAGMA foreign_keys"),
    ).toEqual([{ foreign_keys: 1 }]);
  });
});
