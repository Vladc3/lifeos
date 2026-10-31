import { useEffect, useState } from "react";
import { loadDailyLimit, type DailyLimitData } from "../../db/dailyLimit";
import {
  addDeposit,
  archiveGoal,
  deleteDeposit,
  goalSpending,
  listDeposits,
  listGoals,
  pauseGoal,
  reorderGoals,
  resumeGoal,
  type Goal,
  type GoalSpending,
} from "../../db/goals";
import { listInvestments, type Investment } from "../../db/investments";
import { generateRecurring } from "../../db/recurring";
import type { Db } from "../../db/types";
import { cs } from "../../i18n/cs";
import { formatDate, monthOf, shiftMonth } from "../../lib/dates";
import {
  goalPlan,
  goalsThatDontFit,
  isOverdue,
  limitProgress,
  limitResult,
  monthlyContribution,
  moveInOrder,
  noSpendDays,
} from "../../lib/goals";
import { formatMoney } from "../../lib/money";
import { DepositDialog } from "./DepositDialog";
import { FinanceOverview } from "./FinanceOverview";
import { GoalDialog } from "./GoalDialog";
import { InvestmentsSection } from "./InvestmentsSection";

const t = cs.goals;

interface Data {
  goals: Goal[];
  spending: GoalSpending; // this month
  last: GoalSpending; // last month, for the finished result
  investments: Investment[];
  limit: DailyLimitData | null | undefined; // null = no budget, undefined = failed
}

function ProgressRing({ percent, over }: { percent: number; over: boolean }) {
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
        strokeDashoffset={circumference * (1 - Math.min(100, percent) / 100)}
        transform="rotate(-90 24 24)"
        className={over ? "stroke-danger" : "stroke-success"}
      />
    </svg>
  );
}

/** What a card shows, by goal type (CALC-08, CALC-09, CALC-10). */
function goalView(goal: Goal, data: Data, today: string) {
  const month = monthOf(today);
  const lastMonth = shiftMonth(month, -1);
  const target = goal.target_amount ?? 0;
  const started = monthOf(goal.created_at) <= lastMonth;

  if (goal.type === "limit") {
    const category = goal.category_id ?? 0;
    const spent = data.spending.byCategory[category] ?? 0;
    const result = limitResult(
      data.last.byCategory[category] ?? 0,
      target,
      lastMonth,
      today,
    );
    return {
      percent: limitProgress(spent, target),
      over: spent > target,
      summary: cs.finance.spentOf(formatMoney(spent), formatMoney(target)),
      status: started && result !== "open" ? t.lastMonth[result] : null,
    };
  }

  if (goal.type === "no_spend") {
    const goalDays = goal.target_days ?? 1;
    const days = noSpendDays(data.spending.spendDates, month, today);
    const lastDays = noSpendDays(data.last.spendDates, lastMonth, today);
    return {
      percent: Math.floor((days / goalDays) * 100),
      over: false,
      summary: t.noSpendCount(days, goalDays),
      status: started
        ? t.lastMonth[lastDays >= goalDays ? "met" : "missed"]
        : null,
    };
  }

  const total = goal.saved + goal.deposited;
  const deadline = goal.deadline ?? today;
  return {
    percent: Math.floor((total / target) * 100),
    over: false,
    summary: `${cs.finance.spentOf(formatMoney(total), formatMoney(target))} · ${t.until(formatDate(deadline))}`,
    status: goal.achieved_at
      ? t.achieved
      : goal.paused_at
        ? t.paused
        : t.contribution(
            formatMoney(
              monthlyContribution(target, goal.saved, deadline, today),
            ),
          ),
  };
}

/** FIN-06 to FIN-08: goals by priority, with what does not fit this month. */
export function GoalsScreen(props: {
  db: Db;
  today: string;
  dataVersion: number;
}) {
  const { db, today, dataVersion } = props;
  const [data, setData] = useState<Data | null>(null);
  const [version, setVersion] = useState(0);
  const [editing, setEditing] = useState<Goal | "new" | null>(null);
  const [depositing, setDepositing] = useState<Goal | null>(null);
  const [dragged, setDragged] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    async function load() {
      // E2: same order as Finance, so the limit sees new payments.
      const generated = await generateRecurring(db, today).then(
        () => true,
        () => false,
      );
      const month = monthOf(today);
      const [goals, spending, last, investments, limit] = await Promise.all([
        listGoals(db, month),
        goalSpending(db, month),
        goalSpending(db, shiftMonth(month, -1)),
        listInvestments(db, month),
        generated ? loadDailyLimit(db, today) : undefined,
      ]);
      if (!current) return;
      setError(generated ? null : cs.recurring.generateError);
      setData({ goals, spending, last, investments, limit });
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

  const goals = data?.goals ?? [];
  const order = goals.map((g) => g.id);
  const move = (id: number, to: number) =>
    void run(() => reorderGoals(db, moveInOrder(order, id, to)));

  // FIN-08: nothing to compare with until a budget is set.
  const dontFit = data?.limit
    ? goalsThatDontFit(
        goals.map((g) => ({
          id: g.id,
          remaining: goalPlan(g, today) - g.deposited,
        })),
        data.limit.freeForGoals,
      )
    : [];

  function card(goal: Goal, index: number, shown: Data) {
    const view = goalView(goal, shown, today);
    const overdue =
      goal.deadline !== null &&
      !goal.achieved_at &&
      isOverdue(goal.deadline, today);
    return (
      <li
        key={goal.id}
        draggable
        onDragStart={(event) => {
          // WebKit starts a drag only with data set.
          event.dataTransfer.setData("text/plain", String(goal.id));
          setDragged(goal.id);
        }}
        onDragEnd={() => setDragged(null)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          if (dragged !== null) move(dragged, index);
          setDragged(null);
        }}
        className="flex flex-wrap items-center gap-4 p-4"
      >
        <span className="flex flex-col gap-1">
          <button
            type="button"
            className="btn px-2 py-0"
            aria-label={t.moveUp(goal.name)}
            disabled={index === 0}
            onClick={() => move(goal.id, index - 1)}
          >
            ↑
          </button>
          <button
            type="button"
            className="btn px-2 py-0"
            aria-label={t.moveDown(goal.name)}
            disabled={index === goals.length - 1}
            onClick={() => move(goal.id, index + 1)}
          >
            ↓
          </button>
        </span>
        <ProgressRing percent={view.percent} over={view.over} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {goal.icon} {goal.name}
          </p>
          <p className="text-sm text-text-muted">{view.summary}</p>
          {view.status && <p className="text-sm">{view.status}</p>}
          {overdue && <p className="text-sm text-warning">{t.overdue}</p>}
          {dontFit.includes(goal.id) && (
            <p className="text-sm text-warning">{t.dontFit}</p>
          )}
        </div>
        <span className="flex flex-wrap gap-2">
          {goal.type === "saving" && (
            <button
              type="button"
              className="btn"
              onClick={() => setDepositing(goal)}
            >
              {t.deposit}
            </button>
          )}
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
      {data && (
        <FinanceOverview
          goals={goals}
          investments={data.investments}
          spending={data.spending}
          budget={data.limit?.budget ?? 0}
        />
      )}
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
      {data && goals.length === 0 && (
        <p className="text-text-muted">{t.empty}</p>
      )}
      {data && goals.length > 0 && (
        <ul className="divide-y divide-border rounded-md border border-border">
          {goals.map((goal, index) => card(goal, index, data))}
        </ul>
      )}
      <InvestmentsSection
        db={db}
        today={today}
        dataVersion={dataVersion}
        onChanged={reload}
      />
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
