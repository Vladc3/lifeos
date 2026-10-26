import { useEffect, useState, type FormEvent } from "react";
import {
  listCategories,
  type Category,
  type CategoryKind,
} from "../../db/categories";
import {
  createTransaction,
  updateTransaction,
  type Transaction,
} from "../../db/transactions";
import type { Db } from "../../db/types";
import { cs } from "../../i18n/cs";
import { formatAmountInput } from "../../lib/money";
import {
  categoryOptions,
  validateTransactionForm,
  type TransactionFormValues,
} from "../../lib/transactionForm";
import { dialogClass, useModalDialog } from "../useModalDialog";

export type TransactionDialogState =
  | { mode: "new"; kind: CategoryKind }
  | { mode: "edit"; transaction: Transaction };

interface Props {
  db: Db;
  state: TransactionDialogState;
  today: string;
  onClose: () => void;
  onSaved: () => void;
}

const t = cs.transactionDialog;

function initialValues(
  state: TransactionDialogState,
  today: string,
): TransactionFormValues {
  if (state.mode === "new")
    return {
      amount: "",
      kind: state.kind,
      categoryId: "",
      date: today,
      note: "",
    };
  const tx = state.transaction;
  return {
    amount: formatAmountInput(tx.amount),
    kind: tx.kind,
    categoryId: String(tx.category_id),
    date: tx.date,
    note: tx.note ?? "",
  };
}

/** FIN-01 quick entry and FIN-02 editing in one dialog (plan F2, E9/E10). */
export function TransactionDialog({
  db,
  state,
  today,
  onClose,
  onSaved,
}: Props) {
  const { ref, onCancel } = useModalDialog(onClose);
  const editing = state.mode === "edit" ? state.transaction : null;
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [values, setValues] = useState(() => initialValues(state, today));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listCategories(db).then(setCategories, () => setError(cs.loadError));
  }, [db]);

  const options = categoryOptions(
    categories ?? [],
    values.kind,
    editing?.category_id ?? null,
  );
  // The first category of the kind until the user picks one.
  const categoryId = options.some((c) => String(c.id) === values.categoryId)
    ? values.categoryId
    : String(options[0]?.id ?? "");

  const set = (change: Partial<TransactionFormValues>) =>
    setValues((v) => ({ ...v, ...change }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!categories || saving) return;
    const result = validateTransactionForm(
      { ...values, categoryId },
      categories,
      editing?.category_id ?? null,
    );
    if (!result.ok) {
      setError(t.errors[result.error]);
      return;
    }
    setSaving(true);
    try {
      await (editing
        ? updateTransaction(db, editing.id, result.value)
        : createTransaction(db, result.value));
      onSaved(); // the parent closes the dialog only after a successful save
    } catch {
      setError(cs.saveError);
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={ref}
      onCancel={onCancel}
      aria-labelledby="transaction-title"
      className={dialogClass}
    >
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <h2 id="transaction-title" className="text-xl font-semibold">
          {editing ? t.titleEdit : t.titleNew}
        </h2>

        <label className="block">
          <span className="label">{t.amount}</span>
          <input
            data-autofocus
            inputMode="decimal"
            autoComplete="off"
            value={values.amount}
            onChange={(e) => set({ amount: e.target.value })}
            className="field text-2xl"
          />
        </label>

        <fieldset className="flex gap-6">
          <legend className="label mb-1">{t.kind}</legend>
          {(["expense", "income"] as const).map((kind) => (
            <label key={kind} className="flex items-center gap-2">
              <input
                type="radio"
                name="kind"
                checked={values.kind === kind}
                onChange={() => set({ kind, categoryId: "" })}
                className="accent-text"
              />
              {cs.money[kind]}
            </label>
          ))}
        </fieldset>

        <label className="block">
          <span className="label">{t.category}</span>
          <select
            value={categoryId}
            onChange={(e) => set({ categoryId: e.target.value })}
            className="field"
          >
            {options.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="label">{t.date}</span>
          <input
            type="date"
            value={values.date}
            onChange={(e) => set({ date: e.target.value })}
            className="field"
          />
        </label>

        <label className="block">
          <span className="label">{t.note}</span>
          <input
            value={values.note}
            onChange={(e) => set({ note: e.target.value })}
            className="field"
          />
        </label>

        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn">
            {t.cancel}
          </button>
          <button
            type="submit"
            disabled={saving || !categories}
            className="btn btn-primary"
          >
            {t.save}
          </button>
        </div>
      </form>
    </dialog>
  );
}
