import { beforeEach, describe, expect, it } from "vitest";
import { CATEGORY_COLORS } from "../lib/categoryColors";
import { createTestDb } from "./testDb";
import type { Db } from "./types";

// Plan F2, E2/E3: the DB itself rejects bad finance data, the repositories
// check first and these constraints are the backstop.
let db: Db;
// node:sqlite wording; the app (sqlx) words errors differently, so only tests match on it.
const CONSTRAINT = /constraint failed/;
beforeEach(() => {
  db = createTestDb();
});

const addTransaction = (date: string, amount: number, categoryId: unknown) =>
  db.execute(
    "INSERT INTO transactions (date, amount, category_id) VALUES ($1, $2, $3)",
    [date, amount, categoryId],
  );

const categoryId = async (name: string) =>
  (
    await db.select<{ id: number }[]>(
      "SELECT id FROM categories WHERE name = $1",
      [name],
    )
  )[0].id;

describe("default categories (PRD kap. 10)", () => {
  it("has the 10 expense and 2 income categories, all without a limit", async () => {
    const rows = await db.select<
      { name: string; kind: string; monthly_budget: number }[]
    >("SELECT name, kind, monthly_budget FROM categories ORDER BY id");
    expect(rows.filter((r) => r.kind === "expense").map((r) => r.name)).toEqual(
      [
        "Jídlo",
        "Jídlo venku",
        "Doprava",
        "Auto a motorka",
        "Sport a gym",
        "Škola",
        "Zábava",
        "Předplatné",
        "Oblečení",
        "Ostatní",
      ],
    );
    expect(rows.filter((r) => r.kind === "income").map((r) => r.name)).toEqual([
      "Práce / zakázky",
      "Ostatní příjmy",
    ]);
    expect(rows.every((r) => r.monthly_budget === 0)).toBe(true);
  });

  it("uses only colors from the category palette", async () => {
    const rows = await db.select<{ color: string }[]>(
      "SELECT DISTINCT color FROM categories",
    );
    for (const { color } of rows) expect(CATEGORY_COLORS).toContain(color);
  });
});

describe("transactions constraints (E3)", () => {
  it("accepts a valid transaction", async () => {
    await addTransaction("2026-10-26", 12050, await categoryId("Jídlo"));
    expect(
      await db.select<{ n: number }[]>(
        "SELECT count(*) AS n FROM transactions",
      ),
    ).toEqual([{ n: 1 }]);
  });

  it.each([
    ["amount 0", "2026-10-26", 0],
    ["negative amount", "2026-10-26", -100],
    ["non-existent day", "2026-02-30", 100],
    ["Czech date format", "26.10.2026", 100],
    ["date with time", "2026-10-26 10:00", 100],
  ])("rejects %s", async (_label, date, amount) => {
    await expect(
      addTransaction(date, amount, await categoryId("Jídlo")),
    ).rejects.toThrow(CONSTRAINT);
  });

  it("rejects a missing or unknown category", async () => {
    await expect(addTransaction("2026-10-26", 100, null)).rejects.toThrow(
      CONSTRAINT,
    );
    await expect(addTransaction("2026-10-26", 100, 9999)).rejects.toThrow(
      CONSTRAINT,
    );
  });
});

describe("categories constraints (E2)", () => {
  const addCategory = (name: string, kind: string, budget = 0) =>
    db.execute(
      "INSERT INTO categories (name, icon, color, kind, monthly_budget) VALUES ($1, '☕', '#3b82f6', $2, $3)",
      [name, kind, budget],
    );

  it("rejects an unknown kind and a negative limit", async () => {
    await expect(addCategory("Káva", "gift")).rejects.toThrow(CONSTRAINT);
    await expect(addCategory("Káva", "expense", -1)).rejects.toThrow(
      CONSTRAINT,
    );
  });

  it("rejects a limit on an income category", async () => {
    await expect(addCategory("Bonus", "income", 100)).rejects.toThrow(
      CONSTRAINT,
    );
  });

  it("rejects a second active category with the same name and kind", async () => {
    await expect(addCategory("Jídlo", "expense")).rejects.toThrow(CONSTRAINT);
  });

  it("allows the name again once the old category is archived", async () => {
    await db.execute(
      "UPDATE categories SET archived_at = '2026-10-26' WHERE name = 'Jídlo'",
    );
    await expect(addCategory("Jídlo", "expense")).resolves.toBeDefined();
  });

  it("rejects deleting a category that has transactions", async () => {
    const id = await categoryId("Jídlo");
    await addTransaction("2026-10-26", 100, id);
    await expect(
      db.execute("DELETE FROM categories WHERE id = $1", [id]),
    ).rejects.toThrow(CONSTRAINT);
  });
});
