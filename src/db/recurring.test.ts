import { beforeEach, describe, expect, it } from "vitest";
import {
  archiveRecurring,
  createRecurring,
  generateRecurring,
  insertRun,
  listRecurring,
  updateRecurring,
  type RecurringInput,
} from "./recurring";
import { createTestDb, must } from "./testDb";
import { deleteTransaction, updateTransaction } from "./transactions";
import type { Db } from "./types";

let db: Db;
beforeEach(() => {
  db = createTestDb();
});

const rent: RecurringInput = {
  name: "Nájem",
  amount: 900000,
  category_id: 1,
  day_of_month: 5,
};

const generated = () =>
  db.select<
    {
      id: number;
      date: string;
      amount: number;
      category_id: number;
      note: string | null;
      recurring_id: number;
    }[]
  >(
    "SELECT id, date, amount, category_id, note, recurring_id FROM transactions ORDER BY date",
  );

const dates = async () => (await generated()).map((t) => t.date);

describe("createRecurring (FIN-05, D1)", () => {
  it("fixes first_month at creation and keeps the payment active", async () => {
    await createRecurring(db, rent, "2026-11-20");
    expect(await listRecurring(db)).toEqual([
      {
        ...rent,
        id: 1,
        first_month: "2026-12",
        archived_at: null,
      },
    ]);
  });
});

describe("generateRecurring (CALC-11)", () => {
  it("creates missing months with the payment's name, amount and category", async () => {
    await createRecurring(db, rent, "2026-09-01");
    await generateRecurring(db, "2026-11-04");
    expect(await generated()).toMatchObject([
      {
        date: "2026-09-05",
        amount: 900000,
        category_id: 1,
        note: "Nájem",
        recurring_id: 1,
      },
      { date: "2026-10-05" },
    ]);
  });

  it("the first payment is on or after creation", async () => {
    await createRecurring(db, rent, "2026-11-20");
    await generateRecurring(db, "2026-11-30");
    expect(await dates()).toEqual([]);
    await generateRecurring(db, "2026-12-05");
    expect(await dates()).toEqual(["2026-12-05"]);
  });

  it("a payment due today is generated today", async () => {
    await createRecurring(db, { ...rent, day_of_month: 20 }, "2026-11-20");
    await generateRecurring(db, "2026-11-20");
    expect(await dates()).toEqual(["2026-11-20"]);
  });

  it("running again adds nothing", async () => {
    await createRecurring(db, rent, "2026-09-01");
    await generateRecurring(db, "2026-11-30");
    await generateRecurring(db, "2026-11-30");
    expect(await dates()).toEqual(["2026-09-05", "2026-10-05", "2026-11-05"]);
  });

  it("two generations at once give one transaction per month", async () => {
    await createRecurring(db, rent, "2026-09-01");
    await Promise.all([
      generateRecurring(db, "2026-10-31"),
      generateRecurring(db, "2026-10-31"),
    ]);
    expect(await dates()).toEqual(["2026-09-05", "2026-10-05"]);
  });

  it("a generated payment moved to another month does not regenerate either", async () => {
    await createRecurring(db, rent, "2026-09-01");
    await generateRecurring(db, "2026-09-30");
    const { id } = must((await generated())[0]);
    await updateTransaction(db, id, {
      date: "2026-10-01",
      amount: 900000,
      category_id: 1,
      note: null,
    });
    await generateRecurring(db, "2026-09-30");
    expect(await dates()).toEqual(["2026-10-01"]);
  });

  it("day 31 lands on the last day of February", async () => {
    await createRecurring(db, { ...rent, day_of_month: 31 }, "2027-01-31");
    await generateRecurring(db, "2027-02-28");
    expect(await dates()).toEqual(["2027-01-31", "2027-02-28"]);
  });

  it("a deleted payment stays deleted", async () => {
    await createRecurring(db, rent, "2026-09-01");
    await generateRecurring(db, "2026-09-30");
    await deleteTransaction(db, must((await generated())[0]).id);
    await generateRecurring(db, "2026-09-30");
    expect(await dates()).toEqual([]);
  });

  it("an edited payment stays edited", async () => {
    await createRecurring(db, rent, "2026-09-01");
    await generateRecurring(db, "2026-09-30");
    const { id } = must((await generated())[0]);
    await updateTransaction(db, id, {
      date: "2026-09-07",
      amount: 1000,
      category_id: 1,
      note: null,
    });
    await generateRecurring(db, "2026-09-30");
    expect(await generated()).toMatchObject([
      { date: "2026-09-07", amount: 1000, recurring_id: 1 },
    ]);
  });

  it("an archived category does not stop the payment (E3)", async () => {
    await createRecurring(db, rent, "2026-09-01");
    await db.execute("UPDATE categories SET archived_at = '2026-09-02'");
    await generateRecurring(db, "2026-09-30");
    expect(await dates()).toEqual(["2026-09-05"]);
  });
});

describe("insertRun (E1: the SQL guard, not the dueRuns filter)", () => {
  it("a stale input inserted twice gives one transaction", async () => {
    await createRecurring(db, rent, "2026-09-01");
    const [recurring] = await listRecurring(db);
    const run = { month: "2026-09", date: "2026-09-05" };
    expect((await insertRun(db, recurring, run)).rowsAffected).toBe(1);
    expect((await insertRun(db, recurring, run)).rowsAffected).toBe(0);
    expect(await dates()).toEqual(["2026-09-05"]);
  });

  it("links the run to the transaction it created", async () => {
    await createRecurring(db, rent, "2026-09-01");
    const [recurring] = await listRecurring(db);
    await insertRun(db, recurring, { month: "2026-09", date: "2026-09-05" });
    expect(
      await db.select(
        "SELECT recurring_id, month, transaction_id FROM recurring_runs",
      ),
    ).toEqual([
      {
        recurring_id: 1,
        month: "2026-09",
        transaction_id: must((await generated())[0]).id,
      },
    ]);
  });

  it("guards the month even when the date differs", async () => {
    await createRecurring(db, rent, "2026-09-01");
    const [recurring] = await listRecurring(db);
    await insertRun(db, recurring, { month: "2026-09", date: "2026-09-05" });
    await insertRun(db, recurring, { month: "2026-09", date: "2026-09-25" });
    expect(await dates()).toEqual(["2026-09-05"]);
  });
});

describe("updateRecurring (E2, E3)", () => {
  it("applies only to future runs", async () => {
    await createRecurring(db, rent, "2026-09-01");
    await generateRecurring(db, "2026-09-30");
    await updateRecurring(db, 1, { ...rent, amount: 100 }, "2026-09-30");
    await generateRecurring(db, "2026-10-05");
    expect((await generated()).map((t) => t.amount)).toEqual([900000, 100]);
  });

  it("does not change first_month", async () => {
    await createRecurring(db, rent, "2026-11-20");
    await updateRecurring(db, 1, { ...rent, day_of_month: 25 }, "2026-11-22");
    await generateRecurring(db, "2026-11-30");
    expect(await dates()).toEqual([]);
    expect((await listRecurring(db))[0].first_month).toBe("2026-12");
  });

  it("first generates the months missed so far, with the old amount", async () => {
    await createRecurring(db, rent, "2026-09-01");
    await updateRecurring(db, 1, { ...rent, amount: 100 }, "2026-11-30");
    expect((await generated()).map((t) => t.amount)).toEqual([
      900000, 900000, 900000,
    ]);
  });

  it("changing the day after this month's run does not double it", async () => {
    await createRecurring(db, rent, "2026-09-01");
    await generateRecurring(db, "2026-09-10");
    await updateRecurring(db, 1, { ...rent, day_of_month: 8 }, "2026-09-10");
    await generateRecurring(db, "2026-09-30");
    expect(await dates()).toEqual(["2026-09-05"]);
  });
});

describe("archiveRecurring (E2)", () => {
  it("creates no more payments", async () => {
    await createRecurring(db, rent, "2026-09-01");
    await archiveRecurring(db, 1, "2026-09-02");
    await generateRecurring(db, "2026-12-31");
    expect(await dates()).toEqual([]);
    expect((await listRecurring(db))[0].archived_at).toBe("2026-09-02");
  });

  it("first generates the months missed while the app was closed", async () => {
    await createRecurring(db, rent, "2026-09-01");
    await archiveRecurring(db, 1, "2026-11-30");
    expect(await dates()).toEqual(["2026-09-05", "2026-10-05", "2026-11-05"]);
  });
});
