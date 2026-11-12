import { cs } from "../../i18n/cs";
import { budgetLevel } from "../../lib/budget";
import { formatMoney } from "../../lib/money";

const t = cs.finance;

const levelClass = {
  ok: "bg-success",
  warning: "bg-warning",
  over: "bg-danger",
} as const;

/** FIN-04 bar: green up to 80 %, orange up to 100 %, red over. */
export function BudgetBar(props: {
  label: string;
  spent: number;
  limit: number;
}) {
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
