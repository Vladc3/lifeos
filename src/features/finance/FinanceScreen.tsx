import { useEffect, useState } from "react";
import { listCategories, type Category } from "../../db/categories";
import { getSetting } from "../../db/settings";
import {
  deleteTransaction,
  listTransactions,
  monthExpenses,
  type MonthExpenses,
  type Transaction,
} from "../../db/transactions";
import type { Db } from "../../db/types";
import { cs } from "../../i18n/cs";
import { budgetLevel } from "../../lib/budget";
import { formatDate, formatMonth, monthOf, shiftMonth } from "../../lib/dates";
import { formatMoney } from "../../lib/money";

interface Props {
  db: Db;
  today: string;
  dataVersion: number; // bumped after every save, so the screen reloads
  onNew: () => void;
  onEdit: (transaction: Transaction) => void;
  onChanged: () => void;
  onOpenSettings: () => void;
}

interface Data {
  categories: Category[];
  transactions: Transaction[];
  expenses: MonthExpenses;
  budget: number; // settings.monthly_budget in haléře, 0 = not set
}

const t = cs.finance;

const levelClass = {
  ok: "bg-success",
  warning: "bg-warning",
  over: "bg-danger",
} as const;

/** FIN-04 bar: green up to 80 %, orange up to 100 %, red over. */
function BudgetBar(props: { label: string; spent: number; limit: number }) {
  const level = budgetLevel(props.spent, props.limit) ?? "ok";
  const text = t.spentOf(formatMoney(props.spent), formatMoney(props.limit));
  const width = Math.min(100, (props.spent / props.limit) * 100);
  return (
    <div>
      <div className="flex justify-between gap-4 text-sm">
        <span>{props.label}</span>
        <span className="text-text-muted">{text}</span>
      </div>
      <div
        role="img"
        aria-label={`${props.label}: ${text}`}
        className="mt-1 h-2 rounded-full bg-border"
      >
        <div
          className={`h-2 rounded-full ${levelClass[level]}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export function FinanceScreen(props: Props) {
  const { db, dataVersion } = props;
  const [month, setMonth] = useState(() => monthOf(props.today));
  const [filter, setFilter] = useState<number | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<number | null>(null);

  useEffect(() => {
    let current = true; // ignore answers for a month the user already left
    Promise.all([
      listCategories(db),
      listTransactions(db, month, filter),
      monthExpenses(db, month),
      getSetting(db, "monthly_budget"),
    ]).then(
      ([categories, transactions, expenses, budget]) => {
        if (!current) return;
        setError(null);
        setData({
          categories,
          transactions,
          expenses,
          budget: Number(budget) || 0,
        });
      },
      () => current && setError(cs.loadError),
    );
    return () => {
      current = false;
    };
  }, [db, month, filter, dataVersion]);

  async function remove(id: number) {
    try {
      await deleteTransaction(db, id);
      setConfirming(null);
      props.onChanged();
    } catch {
      setError(cs.saveError);
    }
  }

  const byId = new Map(data?.categories.map((c) => [c.id, c]));
  const limited =
    data?.categories.filter(
      (c) => c.kind === "expense" && c.monthly_budget > 0 && !c.archived_at,
    ) ?? [];

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn"
          aria-label={t.previousMonth}
          onClick={() => setMonth((m) => shiftMonth(m, -1))}
        >
          ‹
        </button>
        <h2 className="min-w-40 text-center text-2xl font-semibold">
          {formatMonth(month)}
        </h2>
        <button
          type="button"
          className="btn"
          aria-label={t.nextMonth}
          onClick={() => setMonth((m) => shiftMonth(m, 1))}
        >
          ›
        </button>
        <button
          type="button"
          className="btn btn-primary ml-auto"
          onClick={props.onNew}
        >
          {t.newTransaction}
        </button>
      </div>

      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}

      {data && (
        <section aria-labelledby="budget-heading" className="space-y-4">
          <h3 id="budget-heading" className="text-lg font-semibold">
            {t.budget}
          </h3>
          <p className="text-4xl font-semibold">
            {formatMoney(data.expenses.total)}
          </p>
          {data.budget > 0 ? (
            <BudgetBar
              label={t.budgetTotal}
              spent={data.expenses.total}
              limit={data.budget}
            />
          ) : (
            <p className="text-text-muted">
              {t.budgetNotSet}{" "}
              <button
                type="button"
                className="underline"
                onClick={props.onOpenSettings}
              >
                {t.budgetOpenSettings}
              </button>
            </p>
          )}
          {limited.length > 0 ? (
            limited.map((c) => (
              <BudgetBar
                key={c.id}
                label={`${c.icon} ${c.name}`}
                spent={data.expenses.byCategory[c.id] ?? 0}
                limit={c.monthly_budget}
              />
            ))
          ) : (
            <p className="text-sm text-text-muted">{t.noCategoryLimits}</p>
          )}
        </section>
      )}

      {data && (
        <section aria-labelledby="transactions-heading" className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h3 id="transactions-heading" className="text-lg font-semibold">
              {t.transactions}
            </h3>
            <label className="block">
              <span className="label">{t.filter}</span>
              <select
                value={filter ?? ""}
                onChange={(e) =>
                  setFilter(e.target.value ? Number(e.target.value) : null)
                }
                className="field"
              >
                <option value="">{t.allCategories}</option>
                {data.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {data.transactions.length === 0 ? (
            <p className="text-text-muted">{t.empty}</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {data.transactions.map((tx) => {
                const category = byId.get(tx.category_id);
                return (
                  <li
                    key={tx.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3"
                  >
                    <span className="w-24 text-sm text-text-muted">
                      {formatDate(tx.date)}
                    </span>
                    <span className="min-w-0 flex-1">
                      {category?.icon} {category?.name}
                      {tx.note && (
                        <span className="block truncate text-sm text-text-muted">
                          {tx.note}
                        </span>
                      )}
                    </span>
                    <span
                      className={
                        tx.kind === "income" ? "text-success" : undefined
                      }
                    >
                      {tx.kind === "income" ? "+" : ""}
                      {formatMoney(tx.amount)}
                    </span>
                    <span className="flex gap-2">
                      {confirming === tx.id ? (
                        <>
                          <button
                            type="button"
                            className="btn border-danger text-danger"
                            onClick={() => void remove(tx.id)}
                          >
                            {t.confirmDelete}
                          </button>
                          <button
                            type="button"
                            className="btn"
                            onClick={() => setConfirming(null)}
                          >
                            {t.cancel}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="btn"
                            onClick={() => props.onEdit(tx)}
                          >
                            {t.edit}
                          </button>
                          <button
                            type="button"
                            className="btn"
                            onClick={() => setConfirming(tx.id)}
                          >
                            {t.delete}
                          </button>
                        </>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
