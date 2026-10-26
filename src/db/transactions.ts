import type { CategoryKind } from "./categories";
import type { Db } from "./types";

export interface TransactionInput {
  date: string; // YYYY-MM-DD
  amount: number; // haléře, > 0
  category_id: number;
  note: string | null;
}

export interface Transaction extends TransactionInput {
  id: number;
  kind: CategoryKind; // not stored: the kind of its category (PRD v0.6 kap. 7)
}

const noteOrNull = (note: string | null) => note?.trim() || null;

export async function createTransaction(
  db: Db,
  input: TransactionInput,
): Promise<void> {
  await db.execute(
    "INSERT INTO transactions (date, amount, category_id, note) VALUES ($1, $2, $3, $4)",
    [input.date, input.amount, input.category_id, noteOrNull(input.note)],
  );
}

export async function updateTransaction(
  db: Db,
  id: number,
  input: TransactionInput,
): Promise<void> {
  await db.execute(
    "UPDATE transactions SET date = $1, amount = $2, category_id = $3, note = $4 WHERE id = $5",
    [input.date, input.amount, input.category_id, noteOrNull(input.note), id],
  );
}

export async function deleteTransaction(db: Db, id: number): Promise<void> {
  await db.execute("DELETE FROM transactions WHERE id = $1", [id]);
}

/** FIN-02: one month (YYYY-MM), newest first, optionally one category. */
export function listTransactions(
  db: Db,
  month: string,
  categoryId: number | null = null,
): Promise<Transaction[]> {
  return db.select<Transaction[]>(
    `SELECT t.id, t.date, t.amount, t.category_id, t.note, c.kind
     FROM transactions t JOIN categories c ON c.id = t.category_id
     WHERE substr(t.date, 1, 7) = $1 AND ($2 IS NULL OR t.category_id = $2)
     ORDER BY t.date DESC, t.id DESC`,
    [month, categoryId],
  );
}

export interface MonthExpenses {
  total: number;
  byCategory: Record<number, number>;
}

/** FIN-04: expenses of a month (YYYY-MM) per category and in total, in haléře. */
export async function monthExpenses(
  db: Db,
  month: string,
): Promise<MonthExpenses> {
  const rows = await db.select<{ category_id: number; spent: number }[]>(
    `SELECT t.category_id, sum(t.amount) AS spent
     FROM transactions t JOIN categories c ON c.id = t.category_id
     WHERE c.kind = 'expense' AND substr(t.date, 1, 7) = $1
     GROUP BY t.category_id`,
    [month],
  );
  return {
    total: rows.reduce((sum, row) => sum + row.spent, 0),
    byCategory: Object.fromEntries(rows.map((r) => [r.category_id, r.spent])),
  };
}
