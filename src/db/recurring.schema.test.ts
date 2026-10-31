import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "./testDb";
import type { Db } from "./types";

// Plan F4, E1: the trigger writes the run in the same statement as the
// transaction, because plugin-sql's pool has no safe BEGIN/COMMIT (Q6).
let db: Db;
const CONSTRAINT = /constraint failed/;
beforeEach(() => {
  db = createTestDb();
});

const addRecurring = (
  amount = 25900,
  day = 5,
  firstMonth: string = "2026-09",
  name: string = "Předplatné",
) =>
  db.execute(
    "INSERT INTO recurring (name, amount, category_id, day_of_month, first_month) VALUES ($1, $2, 1, $3, $4)",
    [name, amount, day, firstMonth],
  );

const addGenerated = (date: string, recurringId: unknown) =>
  db.execute(
    "INSERT INTO transactions (date, amount, category_id, recurring_id) VALUES ($1, 25900, 1, $2)",
    [date, recurringId],
  );

const runs = () =>
  db.select<
    { recurring_id: number; month: string; transaction_id: number | null }[]
  >("SELECT recurring_id, month, transaction_id FROM recurring_runs");

describe("recurring constraints (E1)", () => {
  it("accepts a valid payment", async () => {
    await expect(addRecurring()).resolves.toMatchObject({ rowsAffected: 1 });
  });

  it.each([
    ["amount 0", 0, 5, "2026-09"],
    ["day 0", 100, 0, "2026-09"],
    ["day 32", 100, 32, "2026-09"],
    ["bad month", 100, 5, "2026-9"],
  ])("rejects %s", async (_label, amount, day, month) => {
    await expect(addRecurring(amount, day, month)).rejects.toThrow(CONSTRAINT);
  });

  it("rejects an unknown category", async () => {
    await expect(
      db.execute(
        "INSERT INTO recurring (name, amount, category_id, day_of_month, first_month) VALUES ('x', 1, 999, 1, '2026-09')",
      ),
    ).rejects.toThrow(CONSTRAINT);
  });

  it("rejects a transaction of an unknown payment", async () => {
    await expect(addGenerated("2026-09-05", 999)).rejects.toThrow(CONSTRAINT);
  });
});

describe("recurring_runs trigger (E1, CALC-11)", () => {
  it("records the run of a generated transaction by its month", async () => {
    await addRecurring();
    const { lastInsertId } = await addGenerated("2026-09-05", 1);
    expect(await runs()).toEqual([
      { recurring_id: 1, month: "2026-09", transaction_id: lastInsertId },
    ]);
  });

  it("ignores ordinary transactions", async () => {
    await addGenerated("2026-09-05", null);
    expect(await runs()).toEqual([]);
  });

  it("a second transaction for the same month fails and leaves no transaction", async () => {
    await addRecurring();
    await addGenerated("2026-09-05", 1);
    await expect(addGenerated("2026-09-06", 1)).rejects.toThrow(CONSTRAINT);
    expect(
      await db.select<{ n: number }[]>(
        "SELECT count(*) AS n FROM transactions",
      ),
    ).toEqual([{ n: 1 }]);
  });

  it("deleting the transaction keeps the run, so the month is not generated again", async () => {
    await addRecurring();
    const { lastInsertId } = await addGenerated("2026-09-05", 1);
    await db.execute("DELETE FROM transactions WHERE id = $1", [lastInsertId]);
    expect(await runs()).toEqual([
      { recurring_id: 1, month: "2026-09", transaction_id: null },
    ]);
  });

  it("does not fire on update: moving a generated date keeps its run", async () => {
    await addRecurring();
    const { lastInsertId } = await addGenerated("2026-09-05", 1);
    await db.execute(
      "UPDATE transactions SET date = '2026-10-01' WHERE id = $1",
      [lastInsertId],
    );
    expect((await runs()).map((r) => r.month)).toEqual(["2026-09"]);
  });

  it("a payment with transactions cannot be deleted, only archived", async () => {
    await addRecurring();
    await addGenerated("2026-09-05", 1);
    await expect(db.execute("DELETE FROM recurring")).rejects.toThrow(
      CONSTRAINT,
    );
  });
});

describe("upgrade of a filled DB (plan F4, Migrace)", () => {
  it("keeps version 4 data untouched", async () => {
    const old = createTestDb(4);
    await old.execute(
      "INSERT INTO transactions (date, amount, category_id, note) VALUES ('2026-10-01', 12300, 1, 'káva')",
    );
    await old.execute(
      "INSERT INTO settings (key, value) VALUES ('monthly_budget', '1500000')",
    );
    const snapshot = () =>
      old.select<unknown[]>(
        "SELECT id, date, amount, category_id, note, created_at FROM transactions",
      );
    const before = await snapshot();

    old.migrate(5);

    expect(await snapshot()).toEqual(before);
    expect(await old.select("SELECT recurring_id FROM transactions")).toEqual([
      { recurring_id: null },
    ]);
    expect(await old.select("SELECT * FROM recurring_runs")).toEqual([]);
    expect(await old.select("PRAGMA foreign_key_check")).toEqual([]);
    expect(await old.select("SELECT value FROM settings")).toEqual([
      { value: "1500000" },
    ]);
  });
});
