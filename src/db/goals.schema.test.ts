import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "./testDb";
import type { Db } from "./types";

// Plan F4, E4: the DB is the backstop, the form validates first.
let db: Db;
const CONSTRAINT = /constraint failed/;
beforeEach(() => {
  db = createTestDb();
});

interface Row {
  type: string;
  target_amount: number | null;
  target_days: number | null;
  category_id: number | null;
  deadline: string | null;
}

const saving: Row = {
  type: "saving",
  target_amount: 1000,
  target_days: null,
  category_id: null,
  deadline: "2027-01-01",
};
const limit: Row = {
  type: "limit",
  target_amount: 1000,
  target_days: null,
  category_id: 1,
  deadline: null,
};
const noSpend: Row = {
  type: "no_spend",
  target_amount: null,
  target_days: 10,
  category_id: null,
  deadline: null,
};

const add = (row: Row) =>
  db.execute(
    `INSERT INTO goals (type, name, icon, target_amount, target_days, category_id, deadline, priority)
     VALUES ($1, 'x', 'x', $2, $3, $4, $5, 1)`,
    [
      row.type,
      row.target_amount,
      row.target_days,
      row.category_id,
      row.deadline,
    ],
  );

describe("goals constraints (E4, FIN-06)", () => {
  it.each([
    ["saving", saving],
    ["limit", limit],
    ["no_spend", noSpend],
  ])("accepts a valid %s goal", async (_label, row) => {
    await expect(add(row)).resolves.toMatchObject({ rowsAffected: 1 });
  });

  it.each([
    ["saving without an amount", { ...saving, target_amount: null }],
    ["saving without a deadline", { ...saving, deadline: null }],
    ["saving with a category", { ...saving, category_id: 1 }],
    ["limit without a category", { ...limit, category_id: null }],
    ["limit without an amount", { ...limit, target_amount: null }],
    ["limit with a deadline", { ...limit, deadline: "2027-01-01" }],
    ["no_spend without days", { ...noSpend, target_days: null }],
    ["no_spend with an amount", { ...noSpend, target_amount: 1 }],
    ["no_spend over 31 days", { ...noSpend, target_days: 32 }],
    ["no_spend with 0 days", { ...noSpend, target_days: 0 }],
    ["unknown type", { ...saving, type: "other" }],
    ["amount 0", { ...saving, target_amount: 0 }],
    ["bad deadline", { ...saving, deadline: "1. 1. 2027" }],
    ["unknown category", { ...limit, category_id: 999 }],
  ])("rejects %s", async (_label, row) => {
    await expect(add(row)).rejects.toThrow(CONSTRAINT);
  });

  it("allows a past deadline: an overdue goal must stay editable", async () => {
    await expect(
      add({ ...saving, deadline: "2020-01-01" }),
    ).resolves.toBeTruthy();
  });

  it("allows two goals with one priority: reorder runs through them", async () => {
    await add(saving);
    await expect(add(saving)).resolves.toBeTruthy();
  });
});

describe("goal_deposits constraints (E4, FIN-07)", () => {
  const deposit = (date: string, amount: number, goalId = 1) =>
    db.execute(
      "INSERT INTO goal_deposits (goal_id, date, amount) VALUES ($1, $2, $3)",
      [goalId, date, amount],
    );

  it.each([
    ["amount 0", "2026-10-01", 0, 1],
    ["bad date", "1. 10. 2026", 100, 1],
    ["unknown goal", "2026-10-01", 100, 999],
  ])("rejects %s", async (_label, date, amount, goalId) => {
    await add(saving);
    await expect(deposit(date, amount, goalId)).rejects.toThrow(CONSTRAINT);
  });

  it("a goal with deposits cannot be deleted, only archived", async () => {
    await add(saving);
    await deposit("2026-10-01", 100);
    await expect(db.execute("DELETE FROM goals")).rejects.toThrow(CONSTRAINT);
  });
});

describe("upgrade of a filled DB to version 6", () => {
  it("keeps transactions and recurring payments", async () => {
    const old = createTestDb(5);
    await old.execute(
      "INSERT INTO recurring (name, amount, category_id, day_of_month, first_month) VALUES ('Nájem', 100, 1, 5, '2026-09')",
    );
    await old.execute(
      "INSERT INTO transactions (date, amount, category_id, recurring_id) VALUES ('2026-09-05', 100, 1, 1)",
    );
    old.migrate(6);
    expect(
      await old.select("SELECT month, transaction_id FROM recurring_runs"),
    ).toEqual([{ month: "2026-09", transaction_id: 1 }]);
    expect(await old.select("PRAGMA foreign_key_check")).toEqual([]);
  });
});
