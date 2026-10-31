import { useEffect, useState, type FormEvent } from "react";
import type { Deposit, DepositInput } from "../../db/goals";
import { cs } from "../../i18n/cs";
import { formatDate } from "../../lib/dates";
import { validateDepositForm } from "../../lib/depositForm";
import { formatMoney } from "../../lib/money";
import { dialogClass, useModalDialog } from "../useModalDialog";

const t = cs.goals;

/** FIN-07: add a deposit and delete earlier ones. Investments use it too (FIN-12). */
export function DepositDialog(props: {
  title: string;
  today: string;
  load: () => Promise<Deposit[]>;
  onAdd: (deposit: DepositInput) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onChanged: () => void;
  onClose: () => void;
}) {
  const { load } = props;
  const { ref, onCancel } = useModalDialog(props.onClose);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(props.today);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load().then(setDeposits, () => setError(cs.loadError));
    // load is a new function on every parent render, the list follows version.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  // A write can land and its follow-up fail, so the list always reloads: a
  // deposit that is there must not look unsaved and get entered twice.
  async function run(action: () => Promise<void>) {
    try {
      await action();
      setError(null);
      return true;
    } catch {
      setError(cs.saveError);
      return false;
    } finally {
      setVersion((v) => v + 1);
      props.onChanged();
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = validateDepositForm({ amount, date }, props.today);
    if (!result.ok) {
      setError(result.error === "amount" ? t.errors.amount : t.errors.date);
      return;
    }
    if (await run(() => props.onAdd(result.value))) setAmount("");
  }

  return (
    <dialog
      ref={ref}
      onCancel={onCancel}
      aria-labelledby="deposit-title"
      className={dialogClass}
    >
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <h2 id="deposit-title" className="text-xl font-semibold">
          {t.depositTitle(props.title)}
        </h2>
        <label className="block">
          <span className="label">{cs.transactionDialog.amount}</span>
          <input
            data-autofocus
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="field"
          />
        </label>
        <label className="block">
          <span className="label">{cs.transactionDialog.date}</span>
          <input
            type="date"
            max={props.today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="field"
          />
        </label>
        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={props.onClose} className="btn">
            {t.close}
          </button>
          <button type="submit" className="btn btn-primary">
            {t.addDeposit}
          </button>
        </div>
        {deposits.length > 0 && (
          <div>
            <h3 className="label mb-1">{t.deposits}</h3>
            <ul className="divide-y divide-border rounded-md border border-border">
              {deposits.map((deposit) => (
                <li
                  key={deposit.id}
                  className="flex items-center justify-between gap-3 p-2"
                >
                  <span className="text-sm text-text-muted">
                    {formatDate(deposit.date)}
                  </span>
                  <span className="flex items-center gap-3">
                    {formatMoney(deposit.amount)}
                    <button
                      type="button"
                      className="btn"
                      onClick={() => void run(() => props.onDelete(deposit.id))}
                    >
                      {t.deleteDeposit}
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </form>
    </dialog>
  );
}
