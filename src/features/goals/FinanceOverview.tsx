import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Goal, GoalSpending } from "../../db/goals";
import type { Investment } from "../../db/investments";
import { cs } from "../../i18n/cs";
import { formatMoney } from "../../lib/money";
import { financeOverview } from "../../lib/overview";
import { BudgetBar } from "../finance/BudgetBar";

const t = cs.goals;

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="label">{label}</p>
      <p className="text-xl font-semibold">{formatMoney(value)}</p>
    </div>
  );
}

/** FIN-11 (D6): spending against the budget, saving goals, investments. */
export function FinanceOverview(props: {
  goals: Goal[];
  investments: Investment[];
  spending: GoalSpending;
  budget: number; // 0 = not set
}) {
  const overview = financeOverview(props.goals, props.investments);
  const spent = Object.values(props.spending.byCategory).reduce(
    (sum, amount) => sum + amount,
    0,
  );

  return (
    <section
      aria-labelledby="finance-overview-heading"
      className="space-y-4 rounded-md border border-border bg-surface p-4"
    >
      <h2 id="finance-overview-heading" className="text-xl font-semibold">
        {t.overview}
      </h2>
      {props.budget > 0 ? (
        <BudgetBar
          label={t.spentThisMonth}
          spent={spent}
          limit={props.budget}
        />
      ) : (
        <Stat label={t.spentThisMonth} value={spent} />
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label={t.savedTotal} value={overview.saved} />
        <Stat label={t.investedValue} value={overview.investmentValue} />
        <Stat label={t.investedMonth} value={overview.invested} />
      </div>
      {overview.goals.length > 0 && (
        <div>
          <h3 className="label mb-2">{t.goalsChart}</h3>
          <ResponsiveContainer
            width="100%"
            height={overview.goals.length * 40 + 32}
          >
            <BarChart
              data={overview.goals}
              layout="vertical"
              title={t.goalsChart}
              margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
            >
              <XAxis
                type="number"
                domain={[0, 100]}
                unit=" %"
                stroke="var(--color-text-muted)"
                tickLine={false}
                fontSize={12}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={140}
                stroke="var(--color-text-muted)"
                tickLine={false}
                axisLine={false}
                fontSize={12}
              />
              <Tooltip
                cursor={{ fill: "var(--color-border)" }}
                contentStyle={{
                  background: "var(--color-bg)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 6,
                  color: "var(--color-text)",
                }}
                formatter={(value) => `${String(value)} %`}
              />
              <Bar
                dataKey="percent"
                name={t.fulfilled}
                fill="var(--color-success)"
                background={{ fill: "var(--color-border)" }}
                isAnimationActive={false}
                barSize={14}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
