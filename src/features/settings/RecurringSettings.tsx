import { useEffect, useState, type FormEvent } from "react";
import { listCategories, type Category } from "../../db/categories";
import {
  archiveRecurring,
  createRecurring,
  listRecurring,
  updateRecurring,
  type Recurring,
} from "../../db/recurring";
import type { Db } from "../../db/types";
import { cs } from "../../i18n/cs";
import { formatAmountInput, formatMoney } from "../../lib/money";
import {
  validateRecurringForm,
  type RecurringFormValues,
} from "../../lib/recurringForm";
import { categoryOptions } from "../../lib/transactionForm";
import { dialogClass, useModalDialog } from "../useModalDialog";

const t = cs.recurring;

/** FIN-05: add, edit and archive recurring payments. */
export function RecurringSettings({ db, today }: { db: Db; today: string }) {
  const [payments, setPayments] = useState<Recurring[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [version, setVersion] = useState(0);
  const [editing, setEditing] = useState<Recurring | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listRecurring(db), listCategories(db)]).then(
      ([recurring, list]) => {
        setPayments(recurring);
        setCategories(list);
      },
      () => setError(cs.loadError),
    );
  }, [db, version]);

  const reload = () => setVersion((v) => v + 1);

  async function archive(id: number) {
    setError(null);
    try {
      await archiveRecurring(db, id, today);
      reload();
    } catch {
      setError(cs.saveError);
    }
  }

  const byId = new Map(categories.map((c) => [c.id, c]));

  function row(payment: Recurring) {
    const category = byId.get(payment.category_id);
    return (
      <li key={payment.id} className="p-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="min-w-0 flex-1">
            {category?.icon} {payment.name}
          </span>
          <span className="text-sm text-text-muted">
            {t.everyMonth(payment.day_of_month)}
          </span>
          <span>{formatMoney(payment.amount)}</span>
          {!payment.archived_at && (
            <span className="flex gap-2">
              <button
                type="button"
                className="btn"
                onClick={() => setEditing(payment)}
              >
                {t.edit}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => void archive(payment.id)}
              >
                {t.archive}
              </button>
            </span>
          )}
        </div>
      </li>
    );
  }

  const active = payments.filter((p) => !p.archived_at);
  const archived = payments.filter((p) => p.archived_at);

  return (
    <section aria-labelledby="recurring-heading" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="recurring-heading" className="text-xl font-semibold">
          {t.title}
        </h2>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setEditing("new")}
        >
          {t.add}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      {payments.length === 0 && <p className="text-text-muted">{t.empty}</p>}
      {active.length > 0 && (
        <ul className="divide-y divide-border rounded-md border border-border">
          {active.map(row)}
        </ul>
      )}
      {archived.length > 0 && (
        <div>
          <h3 className="label mb-1">{t.archived}</h3>
          <ul className="divide-y divide-border rounded-md border border-border">
            {archived.map(row)}
          </ul>
        </div>
      )}
      {editing && (
        <RecurringDialog
          key={editing === "new" ? "new" : `edit-${editing.id}`}
          db={db}
          today={today}
          categories={categories}
          payment={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </section>
  );
}

function RecurringDialog(props: {
  db: Db;
  today: string;
  categories: Category[];
  payment: Recurring | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { db, today, categories, payment } = props;
  const { ref, onCancel } = useModalDialog(props.onClose);
  const currentCategoryId = payment?.category_id ?? null;
  const [values, setValues] = useState<RecurringFormValues>(() => ({
    name: payment?.name ?? "",
    amount: payment ? formatAmountInput(payment.amount) : "",
    kind: categories.find((c) => c.id === currentCategoryId)?.kind ?? "expense",
    categoryId: payment ? String(payment.category_id) : "",
    day: payment ? String(payment.day_of_month) : "",
  }));
  const [error, setError] = useState<string | null>(null);

  const set = (change: Partial<RecurringFormValues>) =>
    setValues((v) => ({ ...v, ...change }));
  const options = categoryOptions(categories, values.kind, currentCategoryId);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = validateRecurringForm(values, categories, currentCategoryId);
    if (!result.ok) {
      setError(t.errors[result.error]);
      return;
    }
    try {
      if (payment) await updateRecurring(db, payment.id, result.value, today);
      else await createRecurring(db, result.value, today);
      props.onSaved();
    } catch {
      setError(cs.saveError);
    }
  }

  return (
    <dialog
      ref={ref}
      onCancel={onCancel}
      aria-labelledby="recurring-title"
      className={dialogClass}
    >
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <h2 id="recurring-title" className="text-xl font-semibold">
          {payment ? t.editPayment : t.newPayment}
        </h2>
        <label className="block">
          <span className="label">{t.name}</span>
          <input
            data-autofocus
            maxLength={40}
            value={values.name}
            onChange={(e) => set({ name: e.target.value })}
            className="field"
          />
        </label>
        <label className="block">
          <span className="label">{cs.transactionDialog.amount}</span>
          <input
            inputMode="decimal"
            autoComplete="off"
            value={values.amount}
            onChange={(e) => set({ amount: e.target.value })}
            className="field"
          />
        </label>
        <fieldset className="flex gap-6">
          <legend className="label mb-1">{cs.transactionDialog.kind}</legend>
          {(["expense", "income"] as const).map((kind) => (
            <label key={kind} className="flex items-center gap-2">
              <input
                type="radio"
                name="recurring-kind"
                checked={values.kind === kind}
                onChange={() => set({ kind, categoryId: "" })}
                className="accent-text"
              />
              {cs.money[kind]}
            </label>
          ))}
        </fieldset>
        <label className="block">
          <span className="label">{cs.transactionDialog.category}</span>
          <select
            value={values.categoryId}
            onChange={(e) => set({ categoryId: e.target.value })}
            className="field"
          >
            <option value="" />
            {options.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">{t.day}</span>
          <input
            inputMode="numeric"
            autoComplete="off"
            value={values.day}
            onChange={(e) => set({ day: e.target.value })}
            className="field w-24"
          />
          <span className="text-sm text-text-muted">
            {payment ? t.editHint : t.dayHint}
          </span>
        </label>
        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={props.onClose} className="btn">
            {cs.transactionDialog.cancel}
          </button>
          <button type="submit" className="btn btn-primary">
            {cs.transactionDialog.save}
          </button>
        </div>
      </form>
    </dialog>
  );
}
