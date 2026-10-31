import { useState, type FormEvent } from "react";
import { createGoal, updateGoal, type Goal } from "../../db/goals";
import type { Db } from "../../db/types";
import { cs } from "../../i18n/cs";
import { validateGoalForm, type GoalFormValues } from "../../lib/goalForm";
import { formatAmountInput } from "../../lib/money";
import { dialogClass, useModalDialog } from "../useModalDialog";

const t = cs.goals;

/** FIN-06: add or edit a saving goal. */
export function GoalDialog(props: {
  db: Db;
  today: string;
  goal: Goal | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { db, today, goal } = props;
  const { ref, onCancel } = useModalDialog(props.onClose);
  const [values, setValues] = useState<GoalFormValues>({
    name: goal?.name ?? "",
    icon: goal?.icon ?? "🎯",
    amount: goal?.target_amount ? formatAmountInput(goal.target_amount) : "",
    deadline: goal?.deadline ?? "",
  });
  const [error, setError] = useState<string | null>(null);

  const set = (change: Partial<GoalFormValues>) =>
    setValues((v) => ({ ...v, ...change }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = validateGoalForm(values, today, goal?.deadline ?? null);
    if (!result.ok) {
      setError(t.errors[result.error]);
      return;
    }
    try {
      if (goal) await updateGoal(db, goal.id, result.value, today);
      else await createGoal(db, result.value);
      props.onSaved();
    } catch {
      setError(cs.saveError);
    }
  }

  return (
    <dialog
      ref={ref}
      onCancel={onCancel}
      aria-labelledby="goal-title"
      className={dialogClass}
    >
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <h2 id="goal-title" className="text-xl font-semibold">
          {goal ? t.editGoal : t.newGoal}
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
          <span className="label">{t.amount}</span>
          <input
            inputMode="decimal"
            autoComplete="off"
            value={values.amount}
            onChange={(e) => set({ amount: e.target.value })}
            className="field"
          />
        </label>
        <label className="block">
          <span className="label">{t.deadline}</span>
          <input
            type="date"
            value={values.deadline}
            onChange={(e) => set({ deadline: e.target.value })}
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
