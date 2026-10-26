import { useEffect, useState, type FormEvent } from "react";
import { getSetting, setSetting } from "../../db/settings";
import type { Db } from "../../db/types";
import { cs } from "../../i18n/cs";
import { formatAmountInput, parseOptionalAmount } from "../../lib/money";

const t = cs.settings;

/** FIN-04 / CALC-07: settings.monthly_budget in haléře, 0 = not set. */
export function BudgetSetting({ db }: { db: Db }) {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<"saved" | "error" | null>(null);

  useEffect(() => {
    getSetting(db, "monthly_budget").then(
      (stored) => {
        const halere = Number(stored);
        if (halere > 0) setValue(formatAmountInput(halere));
      },
      () => setStatus("error"),
    );
  }, [db]);

  async function save(event: FormEvent) {
    event.preventDefault();
    const halere = parseOptionalAmount(value);
    if (halere === null) {
      setStatus("error");
      return;
    }
    try {
      await setSetting(db, "monthly_budget", String(halere));
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={(e) => void save(e)} className="space-y-1">
      <label className="block max-w-xs">
        <span className="label">{t.budget}</span>
        <span className="flex gap-2">
          <input
            inputMode="decimal"
            autoComplete="off"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setStatus(null);
            }}
            className="field"
          />
          <button type="submit" className="btn mt-1">
            {cs.transactionDialog.save}
          </button>
        </span>
      </label>
      <p className="text-sm text-text-muted">{t.budgetHint}</p>
      {status === "saved" && <p className="text-success">{t.budgetSaved}</p>}
      {status === "error" && (
        <p role="alert" className="text-danger">
          {t.budgetError}
        </p>
      )}
    </form>
  );
}
