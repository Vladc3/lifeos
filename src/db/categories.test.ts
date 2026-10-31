import { beforeEach, describe, expect, it } from "vitest";
import {
  archiveCategory,
  countTransactions,
  createCategory,
  deleteCategory,
  listCategories,
  restoreCategory,
  updateCategory,
  type CategoryInput,
} from "./categories";
import { archiveRecurring, createRecurring } from "./recurring";
import { createTransaction } from "./transactions";
import { createTestDb, must } from "./testDb";
import type { Db } from "./types";

let db: Db;
beforeEach(() => {
  db = createTestDb();
});

const coffee: CategoryInput = {
  name: "Káva",
  icon: "☕",
  color: "#f59e0b",
  kind: "expense",
  monthly_budget: 50000,
};

const byName = async (name: string) =>
  must(
    (await listCategories(db)).find((c) => c.name === name),
    name,
  );

describe("categories repository (FIN-03)", () => {
  it("lists the default categories, expenses first", async () => {
    const all = await listCategories(db);
    expect(all).toHaveLength(12);
    expect(all[0]).toMatchObject({
      name: "Jídlo",
      kind: "expense",
      monthly_budget: 0,
      archived_at: null,
    });
    expect(all[all.length - 1]).toMatchObject({
      name: "Ostatní příjmy",
      kind: "income",
    });
  });

  it("creates a category and returns its id", async () => {
    const id = await createCategory(db, coffee);
    expect(typeof id).toBe("number");
    expect(await byName("Káva")).toMatchObject({ ...coffee, id });
  });

  it("refuses a name that an active category of the same kind already has", async () => {
    expect(await createCategory(db, { ...coffee, name: "Jídlo" })).toBe(
      "name_taken",
    );
    // the same name as an income category is fine
    expect(
      typeof (await createCategory(db, {
        ...coffee,
        name: "Ostatní příjmy",
      })),
    ).toBe("number");
  });

  it("updates a category; a name clash with another active one is refused", async () => {
    const id = (await createCategory(db, coffee)) as number;
    expect(
      await updateCategory(db, id, { ...coffee, name: "Kafe", icon: "🫖" }),
    ).toBe("ok");
    expect(await byName("Kafe")).toMatchObject({ icon: "🫖" });
    expect(await updateCategory(db, id, { ...coffee, name: "Doprava" })).toBe(
      "name_taken",
    );
    // keeping its own name is not a clash
    expect(await updateCategory(db, id, { ...coffee, name: "Kafe" })).toBe(
      "ok",
    );
  });

  it("changing kind to income drops the limit (PRD: limit only on expenses)", async () => {
    const id = (await createCategory(db, coffee)) as number;
    expect(await updateCategory(db, id, { ...coffee, kind: "income" })).toBe(
      "ok",
    );
    expect(await byName("Káva")).toMatchObject({
      kind: "income",
      monthly_budget: 0,
    });
  });

  it("counts transactions of a category (O2 confirmation)", async () => {
    const id = (await byName("Jídlo")).id;
    expect(await countTransactions(db, id)).toBe(0);
    await createTransaction(db, {
      date: "2026-10-26",
      amount: 100,
      category_id: id,
      note: null,
    });
    expect(await countTransactions(db, id)).toBe(1);
  });

  it("archives and restores; restore is refused when the name was reused", async () => {
    const food = await byName("Jídlo");
    await archiveCategory(db, food.id, "2026-10-26");
    expect((await byName("Jídlo")).archived_at).toBe("2026-10-26");
    expect(await restoreCategory(db, food.id)).toBe("ok");
    expect((await byName("Jídlo")).archived_at).toBeNull();

    await archiveCategory(db, food.id, "2026-10-26");
    await createCategory(db, { ...coffee, name: "Jídlo" });
    expect(await restoreCategory(db, food.id)).toBe("name_taken");
  });

  it("deletes an unused category, refuses a used one (archive instead)", async () => {
    const id = (await createCategory(db, coffee)) as number;
    expect(await deleteCategory(db, id)).toBe("ok");
    expect((await listCategories(db)).some((c) => c.id === id)).toBe(false);

    const food = (await byName("Jídlo")).id;
    await createTransaction(db, {
      date: "2026-10-26",
      amount: 100,
      category_id: food,
      note: null,
    });
    expect(await deleteCategory(db, food)).toBe("in_use");
    expect(await countTransactions(db, food)).toBe(1);
  });
});

describe("categories used by recurring payments (plan F4, E8)", () => {
  const payment = (category_id: number) => ({
    name: "Nájem",
    amount: 900000,
    category_id,
    day_of_month: 25,
  });

  it("cannot delete a category of a payment that has no transactions yet", async () => {
    const { id } = await byName("Jídlo");
    await createRecurring(db, payment(id), "2026-11-01");
    expect(await countTransactions(db, id)).toBe(0);
    expect(await deleteCategory(db, id)).toBe("in_use");
  });

  it("cannot delete a category of an archived payment", async () => {
    const { id } = await byName("Jídlo");
    await createRecurring(db, payment(id), "2026-11-01");
    await archiveRecurring(db, 1, "2026-11-02");
    expect(await deleteCategory(db, id)).toBe("in_use");
  });

  it("locks the kind while an active payment uses the category", async () => {
    const category = await byName("Jídlo");
    await createRecurring(db, payment(category.id), "2026-11-01");
    expect(
      await updateCategory(db, category.id, { ...category, kind: "income" }),
    ).toBe("kind_locked");
    expect((await byName("Jídlo")).kind).toBe("expense");
  });

  it("other edits stay possible while a payment uses the category", async () => {
    const category = await byName("Jídlo");
    await createRecurring(db, payment(category.id), "2026-11-01");
    expect(
      await updateCategory(db, category.id, { ...category, icon: "🍎" }),
    ).toBe("ok");
  });

  it("an archived payment does not lock the kind", async () => {
    const category = await byName("Jídlo");
    await createRecurring(db, payment(category.id), "2026-11-01");
    await archiveRecurring(db, 1, "2026-11-02");
    expect(
      await updateCategory(db, category.id, {
        ...category,
        kind: "income",
        monthly_budget: 0,
      }),
    ).toBe("ok");
  });
});
