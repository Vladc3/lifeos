import { useEffect, useState, type FormEvent } from "react";
import {
  addInvestmentDeposit,
  archiveInvestment,
  createInvestment,
  deleteInvestmentDeposit,
  listInvestmentDeposits,
  listInvestments,
  setInvestmentValue,
  updateInvestment,
  type Investment,
} from "../../db/investments";
import type { Db } from "../../db/types";
import { cs } from "../../i18n/cs";
import { monthOf } from "../../lib/dates";
import {
  validateInvestmentForm,
  type InvestmentFormValues,
} from "../../lib/investmentForm";
import { formatAmountInput, formatMoney } from "../../lib/money";
import { dialogClass, useModalDialog } from "../useModalDialog";
import { DepositDialog } from "./DepositDialog";

const t = cs.investments;

/** FIN-12: accounts with a manual value and a planned monthly deposit. */
export function InvestmentsSection(props: {
  db: Db;
  today: string;
  dataVersion: number;
  onChanged: () => void; // the overview and FIN-08 above depend on investments
}) {
  const { db, today, dataVersion } = props;
  const [investments, setInvestments] = useState<Investment[] | null>(null);
  const [version, setVersion] = useState(0);
  const [editing, setEditing] = useState<Investment | "new" | null>(null);
  const [depositing, setDepositing] = useState<Investment | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    listInvestments(db, monthOf(today)).then(
      (list) => {
        if (!current) return;
        setError(null);
        setInvestments(list);
      },
      () => current && setError(cs.loadError),
    );
    return () => {
      current = false;
    };
  }, [db, today, dataVersion, version]);

  const reload = () => {
    setVersion((v) => v + 1);
    props.onChanged();
  };

  async function archive(id: number) {
    setError(null);
    try {
      await archiveInvestment(db, id, today);
      reload();
    } catch {
      setError(cs.saveError);
    }
  }

  function row(investment: Investment) {
    const remaining = investment.monthly_deposit - investment.deposited;
    return (
      <li key={investment.id} className="flex flex-wrap items-center gap-4 p-4">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {investment.icon} {investment.name}
          </p>
          <p className="text-2xl font-semibold">
            {formatMoney(investment.value)}
          </p>
          {investment.monthly_deposit > 0 && (
            <p className="text-sm text-text-muted">
              {t.perMonth(formatMoney(investment.monthly_deposit))} ·{" "}
              {remaining > 0 ? t.remaining(formatMoney(remaining)) : t.done}
            </p>
          )}
        </div>
        <span className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn"
            onClick={() => setDepositing(investment)}
          >
            {cs.goals.deposit}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setEditing(investment)}
          >
            {cs.goals.edit}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => void archive(investment.id)}
          >
            {cs.goals.archive}
          </button>
        </span>
      </li>
    );
  }

  return (
    <section aria-labelledby="investments-heading" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="investments-heading" className="text-xl font-semibold">
          {t.title}
        </h2>
        <button type="button" className="btn" onClick={() => setEditing("new")}>
          {t.add}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      {investments?.length === 0 && (
        <p className="text-text-muted">{t.empty}</p>
      )}
      {investments && investments.length > 0 && (
        <ul className="divide-y divide-border rounded-md border border-border">
          {investments.map(row)}
        </ul>
      )}
      {depositing && (
        <DepositDialog
          key={depositing.id}
          title={depositing.name}
          today={today}
          load={() => listInvestmentDeposits(db, depositing.id)}
          onAdd={(deposit) => addInvestmentDeposit(db, depositing.id, deposit)}
          onDelete={(id) => deleteInvestmentDeposit(db, id)}
          onChanged={reload}
          onClose={() => setDepositing(null)}
        />
      )}
      {editing && (
        <InvestmentDialog
          key={editing === "new" ? "new" : `edit-${editing.id}`}
          db={db}
          investment={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
          onChanged={reload}
        />
      )}
    </section>
  );
}

function InvestmentDialog(props: {
  db: Db;
  investment: Investment | null;
  onClose: () => void;
  onSaved: () => void;
  onChanged: () => void; // a save can land partly, the list must show it
}) {
  const { db, investment } = props;
  const { ref, onCancel } = useModalDialog(props.onClose);
  const [values, setValues] = useState<InvestmentFormValues>({
    name: investment?.name ?? "",
    icon: investment?.icon ?? "📈",
    value: investment ? formatAmountInput(investment.value) : "",
    monthlyDeposit: investment?.monthly_deposit
      ? formatAmountInput(investment.monthly_deposit)
      : "",
  });
  const [error, setError] = useState<string | null>(null);

  const set = (change: Partial<InvestmentFormValues>) =>
    setValues((v) => ({ ...v, ...change }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = validateInvestmentForm(values);
    if (!result.ok) {
      setError(t.errors[result.error]);
      return;
    }
    try {
      if (investment) {
        await updateInvestment(db, investment.id, result.value);
        // An unchanged value must not cut off the deposits made so far (E5).
        if (result.accountValue !== investment.value)
          await setInvestmentValue(db, investment.id, result.accountValue);
      } else {
        await createInvestment(db, result.value, result.accountValue);
      }
      props.onSaved();
    } catch {
      setError(cs.saveError);
      props.onChanged();
    }
  }

  return (
    <dialog
      ref={ref}
      onCancel={onCancel}
      aria-labelledby="investment-title"
      className={dialogClass}
    >
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <h2 id="investment-title" className="text-xl font-semibold">
          {investment ? t.editInvestment : t.newInvestment}
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
          <span className="label">{t.icon}</span>
          <input
            value={values.icon}
            onChange={(e) => set({ icon: e.target.value })}
            className="field w-24"
          />
        </label>
        <label className="block">
          <span className="label">{t.value}</span>
          <input
            inputMode="decimal"
            autoComplete="off"
            value={values.value}
            onChange={(e) => set({ value: e.target.value })}
            className="field"
          />
          {investment && (
            <span className="text-sm text-text-muted">{t.valueHint}</span>
          )}
        </label>
        <label className="block">
          <span className="label">{t.monthlyDeposit}</span>
          <input
            inputMode="decimal"
            autoComplete="off"
            value={values.monthlyDeposit}
            onChange={(e) => set({ monthlyDeposit: e.target.value })}
            className="field"
          />
          <span className="text-sm text-text-muted">
            {t.monthlyDepositHint}
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
