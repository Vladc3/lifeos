import type { Db } from "./types";

export type CategoryKind = "expense" | "income";

export interface CategoryInput {
  name: string;
  icon: string;
  color: string;
  kind: CategoryKind;
  monthly_budget: number; // haléře, 0 = no limit
}

export interface Category extends CategoryInput {
  id: number;
  archived_at: string | null;
}

// Plan F2, E4: repositories decide from data and return a result. DB constraints
// are only the backstop, because their error texts differ between sqlx and tests.

export function listCategories(db: Db): Promise<Category[]> {
  return db.select<Category[]>(
    "SELECT id, name, icon, color, kind, monthly_budget, archived_at FROM categories ORDER BY kind = 'income', id",
  );
}

async function nameTaken(
  db: Db,
  name: string,
  kind: CategoryKind,
  exceptId: number | null,
): Promise<boolean> {
  const rows = await db.select<unknown[]>(
    "SELECT 1 FROM categories WHERE kind = $1 AND name = $2 AND archived_at IS NULL AND id IS NOT $3",
    [kind, name, exceptId],
  );
  return rows.length > 0;
}

// A limit only exists on expense categories (PRD kap. 7).
const budgetFor = (input: CategoryInput) =>
  input.kind === "expense" ? input.monthly_budget : 0;

export async function createCategory(
  db: Db,
  input: CategoryInput,
): Promise<number | "name_taken"> {
  if (await nameTaken(db, input.name, input.kind, null)) return "name_taken";
  const result = await db.execute(
    "INSERT INTO categories (name, icon, color, kind, monthly_budget) VALUES ($1, $2, $3, $4, $5)",
    [input.name, input.icon, input.color, input.kind, budgetFor(input)],
  );
  return result.lastInsertId as number;
}

// Plan F4, E8: an active recurring expense must not silently become income.
async function kindLocked(
  db: Db,
  id: number,
  kind: CategoryKind,
): Promise<boolean> {
  const rows = await db.select<unknown[]>(
    `SELECT 1 FROM recurring r JOIN categories c ON c.id = r.category_id
     WHERE c.id = $1 AND c.kind <> $2 AND r.archived_at IS NULL`,
    [id, kind],
  );
  return rows.length > 0;
}

/** Changing the kind also changes the kind of its transactions (PRD v0.6, FIN-03). */
export async function updateCategory(
  db: Db,
  id: number,
  input: CategoryInput,
): Promise<"ok" | "name_taken" | "kind_locked"> {
  if (await kindLocked(db, id, input.kind)) return "kind_locked";
  if (await nameTaken(db, input.name, input.kind, id)) return "name_taken";
  await db.execute(
    "UPDATE categories SET name = $1, icon = $2, color = $3, kind = $4, monthly_budget = $5 WHERE id = $6",
    [input.name, input.icon, input.color, input.kind, budgetFor(input), id],
  );
  return "ok";
}

export async function countTransactions(db: Db, id: number): Promise<number> {
  const [row] = await db.select<{ n: number }[]>(
    "SELECT count(*) AS n FROM transactions WHERE category_id = $1",
    [id],
  );
  return row.n;
}

export async function archiveCategory(
  db: Db,
  id: number,
  today: string,
): Promise<void> {
  await db.execute("UPDATE categories SET archived_at = $1 WHERE id = $2", [
    today,
    id,
  ]);
}

export async function restoreCategory(
  db: Db,
  id: number,
): Promise<"ok" | "name_taken"> {
  const [category] = await db.select<Category[]>(
    "SELECT name, kind FROM categories WHERE id = $1",
    [id],
  );
  if (await nameTaken(db, category.name, category.kind, id))
    return "name_taken";
  await db.execute("UPDATE categories SET archived_at = NULL WHERE id = $1", [
    id,
  ]);
  return "ok";
}

/** FIN-03: a used category cannot be deleted, only archived. Archived payments use it too. */
export async function deleteCategory(
  db: Db,
  id: number,
): Promise<"ok" | "in_use"> {
  const payments = await db.select<unknown[]>(
    "SELECT 1 FROM recurring WHERE category_id = $1",
    [id],
  );
  if (payments.length > 0 || (await countTransactions(db, id)) > 0)
    return "in_use";
  await db.execute("DELETE FROM categories WHERE id = $1", [id]);
  return "ok";
}
