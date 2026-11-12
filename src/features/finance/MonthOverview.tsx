import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Category } from "../../db/categories";
import type { MonthExpenses, Transaction } from "../../db/transactions";
import { cs } from "../../i18n/cs";
import { formatMoney } from "../../lib/money";
import { categoryShares, dailySeries, monthTotals } from "../../lib/overview";

const t = cs.finance;

const crowns = (halere: number) =>
  new Intl.NumberFormat("cs-CZ").format(Math.round(halere / 100));

function Stat(props: { label: string; value: number; negative?: boolean }) {
  return (
    <div>
      <p className="label">{props.label}</p>
      <p
        className={`text-xl font-semibold ${props.negative ? "text-danger" : ""}`}
      >
        {formatMoney(props.value)}
      </p>
    </div>
  );
}

/** FIN-09: the month by days and categories, with its totals. */
export function MonthOverview(props: {
  month: string;
  rows: Transaction[];
  expenses: MonthExpenses;
  categories: Category[];
}) {
  const totals = monthTotals(props.rows);
  const shares = categoryShares(props.expenses.byCategory, props.categories);

  return (
    <section aria-labelledby="month-overview-heading" className="space-y-4">
      <h3 id="month-overview-heading" className="text-lg font-semibold">
        {t.monthOverview}
      </h3>
      {props.rows.length === 0 ? (
        <p className="text-text-muted">{t.noMonthData}</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Stat label={t.income} value={totals.income} />
            <Stat label={t.expenses} value={totals.expense} />
            <Stat
              label={t.balance}
              value={totals.balance}
              negative={totals.balance < 0}
            />
          </div>
          <div>
            <h4 className="label mb-2">{t.byDays}</h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={dailySeries(props.rows, props.month)}
                title={t.byDays}
                margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
              >
                <CartesianGrid vertical={false} stroke="var(--color-border)" />
                <XAxis
                  dataKey="day"
                  stroke="var(--color-text-muted)"
                  tickLine={false}
                  fontSize={12}
                />
                <YAxis
                  tickFormatter={crowns}
                  stroke="var(--color-text-muted)"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  width={56}
                />
                <Tooltip
                  cursor={{ fill: "var(--color-border)" }}
                  contentStyle={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 6,
                    color: "var(--color-text)",
                  }}
                  labelFormatter={(day) => t.day(Number(day))}
                  formatter={(value) => formatMoney(Number(value))}
                />
                <Bar
                  dataKey="income"
                  name={t.income}
                  fill="var(--color-success)"
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="expense"
                  name={t.expenses}
                  fill="var(--color-danger)"
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {shares.length > 0 && (
            <div>
              <h4 className="label mb-2">{t.byCategory}</h4>
              <ul className="space-y-2">
                {shares.map((share) => (
                  <li key={share.id}>
                    <div className="flex justify-between gap-4 text-sm">
                      <span>
                        {share.icon} {share.name}
                      </span>
                      <span className="text-text-muted">
                        {formatMoney(share.amount)} · {share.percent} %
                      </span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-border">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${share.percent}%`,
                          background: share.color,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}
