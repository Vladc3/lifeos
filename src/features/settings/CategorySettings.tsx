import { useEffect, useState, type FormEvent } from "react";
import {
  archiveCategory,
  countTransactions,
  createCategory,
  deleteCategory,
  listCategories,
  restoreCategory,
  updateCategory,
  type Category,
} from "../../db/categories";
import type { Db } from "../../db/types";
import { cs } from "../../i18n/cs";
import { CATEGORY_COLORS } from "../../lib/categoryColors";
import {
  validateCategoryForm,
  type CategoryFormValues,
} from "../../lib/categoryForm";
import { formatAmountInput, formatMoney } from "../../lib/money";
import { dialogClass, useModalDialog } from "../useModalDialog";

const t = cs.settings;

/** FIN-03: add, edit, archive, restore, delete an unused category. */
export function CategorySettings({ db, today }: { db: Db; today: string }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [version, setVersion] = useState(0);
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [notice, setNotice] = useState<{ id: number; text: string } | null>(
    null,
  );

  useEffect(() => {
    listCategories(db).then(setCategories, () =>
      setNotice({ id: 0, text: cs.loadError }),
    );
  }, [db, version]);

  const reload = () => setVersion((v) => v + 1);

  async function run(id: number, action: () => Promise<unknown>) {
    setNotice(null);
    try {
      const result = await action();
      if (result === "in_use") setNotice({ id, text: t.errors.inUse });
      if (result === "name_taken") setNotice({ id, text: t.errors.nameTaken });
      reload();
    } catch {
      setNotice({ id, text: cs.saveError });
    }
  }

  function row(c: Category) {
    return (
      <li key={c.id} className="p-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span
            className="size-3 rounded-full"
            style={{ background: c.color }}
          />
          <span className="min-w-0 flex-1">
            {c.icon} {c.name}
          </span>
          {c.kind === "expense" && (
            <span className="text-sm text-text-muted">
              {c.monthly_budget > 0 ? formatMoney(c.monthly_budget) : t.noLimit}
            </span>
          )}
          <span className="flex gap-2">
            {c.archived_at ? (
              <button
                type="button"
                className="btn"
                onClick={() => void run(c.id, () => restoreCategory(db, c.id))}
              >
                {t.restore}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setEditing(c)}
                >
                  {t.edit}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() =>
                    void run(c.id, () => archiveCategory(db, c.id, today))
                  }
                >
                  {t.archive}
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => void run(c.id, () => deleteCategory(db, c.id))}
                >
                  {t.delete}
                </button>
              </>
            )}
          </span>
        </div>
        {notice?.id === c.id && (
          <p role="alert" className="mt-2 text-sm text-danger">
            {notice.text}
          </p>
        )}
      </li>
    );
  }

  const groups = [
    [
      t.expenseCategories,
      categories.filter((c) => !c.archived_at && c.kind === "expense"),
    ],
    [
      t.incomeCategories,
      categories.filter((c) => !c.archived_at && c.kind === "income"),
    ],
    [t.archivedCategories, categories.filter((c) => c.archived_at)],
  ] as const;

  return (
    <section aria-labelledby="categories-heading" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="categories-heading" className="text-xl font-semibold">
          {t.categories}
        </h2>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setEditing("new")}
        >
          {t.addCategory}
        </button>
      </div>
      {notice?.id === 0 && (
        <p role="alert" className="text-danger">
          {notice.text}
        </p>
      )}
      {groups.map(
        ([title, list]) =>
          list.length > 0 && (
            <div key={title}>
              <h3 className="label mb-1">{title}</h3>
              <ul className="divide-y divide-border rounded-md border border-border">
                {list.map(row)}
              </ul>
            </div>
          ),
      )}
      {editing && (
        <CategoryDialog
          db={db}
          category={editing === "new" ? null : editing}
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

function CategoryDialog(props: {
  db: Db;
  category: Category | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { db, category } = props;
  const { ref, onCancel } = useModalDialog(props.onClose);
  const [values, setValues] = useState<CategoryFormValues>(() =>
    category
      ? {
          name: category.name,
          icon: category.icon,
          color: category.color,
          kind: category.kind,
          budget:
            category.monthly_budget > 0
              ? formatAmountInput(category.monthly_budget)
              : "",
        }
      : {
          name: "",
          icon: "",
          color: CATEGORY_COLORS[0],
          kind: "expense",
          budget: "",
        },
  );
  const [error, setError] = useState<string | null>(null);
  // O2: number of transactions whose kind changes too; asked once before saving.
  const [confirmCount, setConfirmCount] = useState<number | null>(null);

  const set = (change: Partial<CategoryFormValues>) => {
    setValues((v) => ({ ...v, ...change }));
    if (change.kind) setConfirmCount(null);
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = validateCategoryForm(values);
    if (!result.ok) {
      setError(t.errors[result.error]);
      return;
    }
    try {
      if (category && category.kind !== values.kind && confirmCount === null) {
        const count = await countTransactions(db, category.id);
        if (count > 0) {
          setConfirmCount(count);
          return;
        }
      }
      const saved = category
        ? await updateCategory(db, category.id, result.value)
        : await createCategory(db, result.value);
      if (saved === "name_taken") setError(t.errors.nameTaken);
      else if (saved === "kind_locked") setError(t.errors.kindLocked);
      else props.onSaved();
    } catch {
      setError(cs.saveError);
    }
  }

  return (
    <dialog
      ref={ref}
      onCancel={onCancel}
      aria-labelledby="category-title"
      className={dialogClass}
    >
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <h2 id="category-title" className="text-xl font-semibold">
          {category ? t.editCategory : t.newCategory}
        </h2>
        <label className="block">
          <span className="label">{t.name}</span>
          <input
            data-autofocus
            value={values.name}
            onChange={(e) => set({ name: e.target.value })}
            className="field"
          />
        </label>
        <label className="block">
          <span className="label">{t.icon}</span>
          <input
            value={values.icon}
            onChange={(e) => set({ icon: e.target.value })}
            className="field w-24"
          />
        </label>
        <fieldset>
          <legend className="label mb-1">{t.color}</legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_COLORS.map((color, i) => (
              <label key={color}>
                <input
                  type="radio"
                  name="color"
                  checked={values.color === color}
                  onChange={() => set({ color })}
                  aria-label={`${t.color} ${i + 1}`}
                  className="peer sr-only"
                />
                <span
                  className="block size-7 rounded-full peer-checked:ring-2 peer-checked:ring-text peer-checked:ring-offset-2 peer-checked:ring-offset-surface peer-focus-visible:outline-2 peer-focus-visible:outline-text"
                  style={{ background: color }}
                />
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="flex gap-6">
          <legend className="label mb-1">{t.kind}</legend>
          {(["expense", "income"] as const).map((kind) => (
            <label key={kind} className="flex items-center gap-2">
              <input
                type="radio"
                name="kind"
                checked={values.kind === kind}
                onChange={() => set({ kind })}
                className="accent-text"
              />
              {cs.money[kind]}
            </label>
          ))}
        </fieldset>
        {values.kind === "expense" && (
          <label className="block">
            <span className="label">{t.limit}</span>
            <input
              inputMode="decimal"
              autoComplete="off"
              value={values.budget}
              onChange={(e) => set({ budget: e.target.value })}
              className="field"
            />
            <span className="text-sm text-text-muted">{t.limitHint}</span>
          </label>
        )}
        {confirmCount !== null && (
          <p role="alert" className="text-warning">
            {t.kindChange(confirmCount)}
          </p>
        )}
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
            {confirmCount !== null
              ? t.kindChangeConfirm
              : cs.transactionDialog.save}
          </button>
        </div>
      </form>
    </dialog>
  );
}
