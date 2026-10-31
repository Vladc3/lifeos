import { beforeEach, describe, expect, it } from "vitest";
import {
  addInvestmentDeposit,
  archiveInvestment,
  createInvestment,
  deleteInvestmentDeposit,
  listInvestmentDeposits,
  listInvestments,
  setInvestmentValue,
  updateInvestment,
  type InvestmentInput,
} from "./investments";
import { createTestDb, must } from "./testDb";
import type { Db } from "./types";

let db: Db;
beforeEach(() => {
  db = createTestDb();
});

const etf: InvestmentInput = {
  name: "ETF",
  icon: "📈",
  monthly_deposit: 200000,
};

const first = async (month = "2026-10") =>
  must((await listInvestments(db, month))[0]);
const add = (amount: number, date = "2026-10-05") =>
  addInvestmentDeposit(db, 1, { date, amount });

describe("constraints (E5, FIN-12)", () => {
  const CONSTRAINT = /constraint failed/;

  it.each([
    ["negative value", -1, 0],
    ["negative monthly deposit", 0, -1],
  ])("rejects %s", async (_label, value, monthly) => {
    await expect(
      createInvestment(db, { ...etf, monthly_deposit: monthly }, value),
    ).rejects.toThrow(CONSTRAINT);
  });

  it("rejects a deposit of 0 or of an unknown account", async () => {
    await createInvestment(db, etf, 0);
    await expect(add(0)).rejects.toThrow(CONSTRAINT);
    await expect(
      addInvestmentDeposit(db, 99, { date: "2026-10-05", amount: 1 }),
    ).rejects.toThrow(CONSTRAINT);
  });
});

describe("value (FIN-12, E5)", () => {
  it("starts at the base and grows with deposits", async () => {
    await createInvestment(db, etf, 4000000);
    expect((await first()).value).toBe(4000000);
    await add(200000);
    expect((await first()).value).toBe(4200000);
  });

  it("deleting a deposit lowers the value", async () => {
    await createInvestment(db, etf, 4000000);
    await add(200000);
    await deleteInvestmentDeposit(db, 1);
    expect((await first()).value).toBe(4000000);
  });

  it("a deposit before an overwrite no longer counts, its deletion changes nothing", async () => {
    await createInvestment(db, etf, 4000000);
    await add(200000);
    await setInvestmentValue(db, 1, 5000000);
    expect((await first()).value).toBe(5000000);
    await deleteInvestmentDeposit(db, 1);
    expect((await first()).value).toBe(5000000);
  });

  it("a new deposit after an overwrite counts", async () => {
    await createInvestment(db, etf, 4000000);
    await add(200000);
    await setInvestmentValue(db, 1, 5000000);
    await add(100000);
    expect((await first()).value).toBe(5100000);
  });

  it("the id of a deleted deposit is not reused", async () => {
    await createInvestment(db, etf, 4000000);
    await add(200000);
    await setInvestmentValue(db, 1, 5000000);
    await deleteInvestmentDeposit(db, 1);
    await add(100000);
    expect((await first()).value).toBe(5100000);
  });

  it("each account has its own deposits and overwrite", async () => {
    await createInvestment(db, etf, 100);
    await createInvestment(db, { ...etf, name: "Krypto" }, 1000);
    await add(5);
    await addInvestmentDeposit(db, 2, { date: "2026-10-05", amount: 7 });
    await setInvestmentValue(db, 1, 200);
    await add(1);
    expect((await listInvestments(db, "2026-10")).map((i) => i.value)).toEqual([
      201, 1007,
    ]);
  });
});

describe("sums of the month (CALC-07)", () => {
  it("counts deposits of the month, including ones before an overwrite", async () => {
    await createInvestment(db, etf, 0);
    await add(300, "2026-09-30");
    await add(40, "2026-10-01");
    await setInvestmentValue(db, 1, 1000);
    await add(2, "2026-10-31");
    expect((await first()).deposited).toBe(42);
  });
});

describe("sums per account", () => {
  it("deposits of the month belong to their account", async () => {
    await createInvestment(db, etf, 0);
    await createInvestment(db, etf, 0);
    await add(5);
    expect((await first()).deposited).toBe(5);
    expect(must((await listInvestments(db, "2026-10"))[1]).deposited).toBe(0);
  });
});

describe("account (FIN-12)", () => {
  it("edits name, icon and monthly deposit, not the value", async () => {
    await createInvestment(db, etf, 4000000);
    await updateInvestment(db, 1, {
      name: "Akcie",
      icon: "💹",
      monthly_deposit: 1,
    });
    expect(await first()).toMatchObject({
      name: "Akcie",
      icon: "💹",
      monthly_deposit: 1,
      value: 4000000,
    });
  });

  it("an archived account leaves the list", async () => {
    await createInvestment(db, etf, 0);
    await archiveInvestment(db, 1, "2026-10-01");
    expect(await listInvestments(db, "2026-10")).toEqual([]);
  });

  it("lists deposits newest first, only of that account", async () => {
    await createInvestment(db, etf, 0);
    await createInvestment(db, etf, 0);
    await add(1, "2026-09-01");
    await add(2, "2026-10-01");
    await addInvestmentDeposit(db, 2, { date: "2026-10-01", amount: 3 });
    expect(await listInvestmentDeposits(db, 1)).toEqual([
      { id: 2, date: "2026-10-01", amount: 2 },
      { id: 1, date: "2026-09-01", amount: 1 },
    ]);
  });

  it("deleting a deposit keeps the others", async () => {
    await createInvestment(db, etf, 0);
    await add(1);
    await add(2);
    await deleteInvestmentDeposit(db, 1);
    expect((await listInvestmentDeposits(db, 1)).map((d) => d.amount)).toEqual([
      2,
    ]);
  });

  it("a deposit is not a transaction", async () => {
    await createInvestment(db, etf, 0);
    await add(100);
    expect(await db.select("SELECT id FROM transactions")).toEqual([]);
  });
});

describe("upgrade of a filled DB to version 7", () => {
  it("keeps goals and their deposits", async () => {
    const old = createTestDb(6);
    await old.execute(
      `INSERT INTO goals (type, name, icon, target_amount, deadline, priority)
       VALUES ('saving', 'x', 'x', 100, '2027-01-01', 1)`,
    );
    await old.execute(
      "INSERT INTO goal_deposits (goal_id, date, amount) VALUES (1, '2026-10-01', 5)",
    );
    old.migrate(7);
    expect(await old.select("SELECT amount FROM goal_deposits")).toEqual([
      { amount: 5 },
    ]);
    expect(await old.select("PRAGMA foreign_key_check")).toEqual([]);
  });
});
