import { beforeEach, describe, expect, it } from "vitest";
import { listCategories, updateCategory } from "./categories";
import {
  createTransaction,
  deleteTransaction,
  listTransactions,
  monthExpenses,
  updateTransaction,
} from "./transactions";
import { createTestDb, must } from "./testDb";
import type { Db } from "./types";

let db: Db;
let food: number;
let transport: number;
let salary: number;

beforeEach(async () => {
  db = createTestDb();
  const all = await listCategories(db);
  const id = (name: string) =>
    must(
      all.find((c) => c.name === name),
      name,
    ).id;
  food = id("Jídlo");
  transport = id("Doprava");
  salary = id("Práce / zakázky");
});

const add = (date: string, amount: number, category_id: number, note = null) =>
  createTransaction(db, { date, amount, category_id, note });

describe("transactions repository (FIN-01, FIN-02)", () => {
  it("lists one month, newest first, with the kind taken from the category", async () => {
    await add("2026-09-30", 100, food);
    await add("2026-10-01", 200, food);
    await add("2026-10-26", 300, salary);
    await add("2026-11-01", 400, food);

    const october = await listTransactions(db, "2026-10");
    expect(october.map((t) => [t.date, t.amount, t.kind])).toEqual([
      ["2026-10-26", 300, "income"],
      ["2026-10-01", 200, "expense"],
    ]);
  });

  it("filters by category", async () => {
    await add("2026-10-01", 200, food);
    await add("2026-10-02", 50, transport);
    const rows = await listTransactions(db, "2026-10", transport);
    expect(rows.map((t) => t.amount)).toEqual([50]);
  });

  it("stores the note, an empty note as null", async () => {
    await createTransaction(db, {
      date: "2026-10-26",
      amount: 100,
      category_id: food,
      note: "rohlíky",
    });
    await createTransaction(db, {
      date: "2026-10-25",
      amount: 100,
      category_id: food,
      note: "   ",
    });
    const rows = await listTransactions(db, "2026-10");
    expect(rows.map((t) => t.note)).toEqual(["rohlíky", null]);
  });

  it("updates and deletes", async () => {
    await add("2026-10-26", 100, food);
    const [tx] = await listTransactions(db, "2026-10");
    await updateTransaction(db, tx.id, {
      date: "2026-10-20",
      amount: 9900,
      category_id: transport,
      note: "vlak",
    });
    expect(await listTransactions(db, "2026-10")).toMatchObject([
      {
        date: "2026-10-20",
        amount: 9900,
        category_id: transport,
        note: "vlak",
      },
    ]);
    await deleteTransaction(db, tx.id);
    expect(await listTransactions(db, "2026-10")).toEqual([]);
  });

  it("changing a category's kind changes its transactions too (PRD v0.6, O2)", async () => {
    await add("2026-10-26", 100, food);
    const category = must(
      (await listCategories(db)).find((c) => c.id === food),
    );
    await updateCategory(db, food, { ...category, kind: "income" });
    expect((await listTransactions(db, "2026-10"))[0].kind).toBe("income");
  });
});

describe("monthExpenses (FIN-04)", () => {
  it("sums expenses of the month per category and in total, ignoring income and other months", async () => {
    await add("2026-10-01", 1000, food);
    await add("2026-10-15", 500, food);
    await add("2026-10-20", 250, transport);
    await add("2026-10-20", 99999, salary); // income, not an expense
    await add("2026-09-30", 7777, food); // other month
    await add("2026-10-31", 1, food); // last day still counts

    expect(await monthExpenses(db, "2026-10")).toEqual({
      total: 1751,
      byCategory: { [food]: 1501, [transport]: 250 },
    });
  });

  it("is zero for a month without expenses", async () => {
    expect(await monthExpenses(db, "2026-10")).toEqual({
      total: 0,
      byCategory: {},
    });
  });
});
