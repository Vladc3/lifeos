import type { Deposit, DepositInput } from "./goals";
import type { Db } from "./types";

export interface InvestmentInput {
  name: string;
  icon: string;
  monthly_deposit: number; // haléře, 0 = no plan
}

export interface Investment extends InvestmentInput {
  id: number;
  value: number; // haléře, plan F4, E5
  deposited: number; // deposits in the month (CALC-07)
}

/** FIN-12: active accounts, with the deposits of a month (YYYY-MM). */
export function listInvestments(db: Db, month: string): Promise<Investment[]> {
  return db.select<Investment[]>(
    `SELECT i.id, i.name, i.icon, i.monthly_deposit,
       i.base_value + coalesce((SELECT sum(d.amount) FROM investment_deposits d
         WHERE d.investment_id = i.id AND d.id > i.base_deposit_id), 0) AS value,
       coalesce((SELECT sum(d.amount) FROM investment_deposits d
         WHERE d.investment_id = i.id AND substr(d.date, 1, 7) = $1), 0) AS deposited
     FROM investments i WHERE i.archived_at IS NULL ORDER BY i.id`,
    [month],
  );
}

export async function createInvestment(
  db: Db,
  input: InvestmentInput,
  value: number,
): Promise<void> {
  await db.execute(
    "INSERT INTO investments (name, icon, base_value, monthly_deposit) VALUES ($1, $2, $3, $4)",
    [input.name, input.icon, value, input.monthly_deposit],
  );
}

export async function updateInvestment(
  db: Db,
  id: number,
  input: InvestmentInput,
): Promise<void> {
  await db.execute(
    "UPDATE investments SET name = $1, icon = $2, monthly_deposit = $3 WHERE id = $4",
    [input.name, input.icon, input.monthly_deposit, id],
  );
}

/** E5: one statement sets both columns, so deposits so far stop counting. */
export async function setInvestmentValue(
  db: Db,
  id: number,
  value: number,
): Promise<void> {
  await db.execute(
    `UPDATE investments SET base_value = $1, base_deposit_id = (
       SELECT coalesce(max(d.id), 0) FROM investment_deposits d WHERE d.investment_id = $2
     ) WHERE id = $2`,
    [value, id],
  );
}

export async function archiveInvestment(
  db: Db,
  id: number,
  today: string,
): Promise<void> {
  await db.execute("UPDATE investments SET archived_at = $1 WHERE id = $2", [
    today,
    id,
  ]);
}

export function listInvestmentDeposits(
  db: Db,
  investmentId: number,
): Promise<Deposit[]> {
  return db.select<Deposit[]>(
    "SELECT id, date, amount FROM investment_deposits WHERE investment_id = $1 ORDER BY date DESC, id DESC",
    [investmentId],
  );
}

/** FIN-12: a deposit is not an expense, so it is not a transaction. */
export async function addInvestmentDeposit(
  db: Db,
  investmentId: number,
  input: DepositInput,
): Promise<void> {
  await db.execute(
    "INSERT INTO investment_deposits (investment_id, date, amount) VALUES ($1, $2, $3)",
    [investmentId, input.date, input.amount],
  );
}

export async function deleteInvestmentDeposit(
  db: Db,
  id: number,
): Promise<void> {
  await db.execute("DELETE FROM investment_deposits WHERE id = $1", [id]);
}
