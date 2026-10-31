import { useEffect, useState } from "react";
import {
  addDeposit,
  archiveGoal,
  deleteDeposit,
  listDeposits,
  listGoals,
  pauseGoal,
  resumeGoal,
  type Goal,
} from "../../db/goals";
import { generateRecurring } from "../../db/recurring";
import type { Db } from "../../db/types";
import { cs } from "../../i18n/cs";
import { formatDate, monthOf } from "../../lib/dates";
import { isOverdue, monthlyContribution } from "../../lib/goals";
import { formatMoney } from "../../lib/money";
import { DepositDialog } from "./DepositDialog";
import { GoalDialog } from "./GoalDialog";

const t = cs.goals;

function ProgressRing({ percent }: { percent: number }) {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg
      viewBox="0 0 48 48"
      role="img"
      aria-label={t.progress(percent)}
      className="size-12 shrink-0"
    >
      <circle
        cx="24"
        cy="24"
        r={radius}
        fill="none"
        strokeWidth="5"
        className="stroke-border"
      />
      <circle
        cx="24"
        cy="24"
        r={radius}
        fill="none"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - percent / 100)}
        transform="rotate(-90 24 24)"
        className="stroke-success"
      />
    </svg>
  );
}

/** FIN-06, CALC-08: goals by priority. */
export function GoalsScreen(props: {
  db: Db;
  today: string;
  dataVersion: number;
}) {
  const { db, today, dataVersion } = props;
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [version, setVersion] = useState(0);
  const [editing, setEditing] = useState<Goal | "new" | null>(null);
  const [depositing, setDepositing] = useState<Goal | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    async function load() {
      // E2: same order as Finance, so FIN-11 and the limit see new payments.
      const generated = await generateRecurring(db, today).then(
        () => true,
        () => false,
      );
      const list = await listGoals(db, monthOf(today));
      if (!current) return;
      setError(generated ? null : cs.recurring.generateError);
      setGoals(list);
    }
    load().catch(() => current && setError(cs.loadError));
    return () => {
      current = false;
    };
  }, [db, today, dataVersion, version]);

  const reload = () => setVersion((v) => v + 1);

  async function run(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
      reload();
    } catch {
      setError(cs.saveError);
    }
  }

  function card(goal: Goal) {
    const target = goal.target_amount ?? 0;
    const total = goal.saved + goal.deposited;
    const percent = Math.min(100, Math.floor((total / target) * 100));
    const overdue =
      goal.deadline !== null &&
      !goal.achieved_at &&
      isOverdue(goal.deadline, today);
    return (
      <li key={goal.id} className="flex flex-wrap items-center gap-4 p-4">
        <ProgressRing percent={percent} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {goal.icon} {goal.name}
          </p>
          <p className="text-sm text-text-muted">
            {cs.finance.spentOf(formatMoney(total), formatMoney(target))}
            {goal.deadline && ` · ${t.until(formatDate(goal.deadline))}`}
          </p>
          <p className="text-sm">
            {goal.achieved_at
              ? t.achieved
              : goal.paused_at
                ? t.paused
                : t.contribution(
                    formatMoney(
                      monthlyContribution(
                        target,
                        goal.saved,
                        goal.deadline ?? today,
                        today,
                      ),
                    ),
                  )}
          </p>
          {overdue && <p className="text-sm text-warning">{t.overdue}</p>}
        </div>
        <span className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn"
            onClick={() => setDepositing(goal)}
          >
            {t.deposit}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => setEditing(goal)}
          >
            {overdue ? t.extend : t.edit}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() =>
              void run(() =>
                goal.paused_at
                  ? resumeGoal(db, goal.id)
                  : pauseGoal(db, goal.id, today),
              )
            }
          >
            {goal.paused_at ? t.resume : t.pause}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => void run(() => archiveGoal(db, goal.id, today))}
          >
            {t.archive}
          </button>
        </span>
      </li>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex justify-end">
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
      {goals?.length === 0 && <p className="text-text-muted">{t.empty}</p>}
      {goals && goals.length > 0 && (
        <ul className="divide-y divide-border rounded-md border border-border">
          {goals.map(card)}
        </ul>
      )}
      {depositing && (
        <DepositDialog
          key={depositing.id}
          title={depositing.name}
          today={today}
          load={() => listDeposits(db, depositing.id)}
          onAdd={async (deposit) => {
            await addDeposit(db, depositing.id, deposit, today);
            reload();
          }}
          onDelete={async (id) => {
            await deleteDeposit(db, id, depositing.id, today);
            reload();
          }}
          onClose={() => setDepositing(null)}
        />
      )}
      {editing && (
        <GoalDialog
          key={editing === "new" ? "new" : `edit-${editing.id}`}
          db={db}
          today={today}
          goal={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
