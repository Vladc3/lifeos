import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  listHabits,
  listLogs,
  listPauses,
  setLog,
  type Habit,
  type StoredLog,
  type StoredPause,
} from "../../db/habits";
import type { Db } from "../../db/types";
import { cs } from "../../i18n/cs";
import {
  addDays,
  formatDate,
  formatMonth,
  monthOf,
  shiftMonth,
  todayLocal,
} from "../../lib/dates";
import {
  dayStatuses,
  habitStreak,
  isScheduled,
  nextCellStatus,
  type DayStatus,
} from "../../lib/habits";

const t = cs.habits;

interface Data {
  habits: Habit[];
  logs: StoredLog[];
  pauses: StoredPause[];
}

const cellLook: Record<DayStatus, { symbol: string; className: string }> = {
  done: { symbol: "✓", className: "bg-success text-bg" },
  minimum: { symbol: "◐", className: "bg-warning text-bg" },
  missed: { symbol: "✗", className: "bg-surface text-danger" },
  rest: { symbol: "–", className: "bg-surface text-text-muted" },
  pending: { symbol: "·", className: "bg-surface text-text-muted" },
  unscheduled: { symbol: "", className: "bg-surface/40" },
};

/** HAB-03 matrix, HAB-04 streak. All rules come from src/lib/habits.ts. */
export function HabitsScreen(props: {
  db: Db;
  dataVersion: number;
  onAdd: () => void;
}) {
  const { db, dataVersion } = props;
  const today = todayLocal(new Date());
  const [month, setMonth] = useState(() => monthOf(today));
  const [data, setData] = useState<Data | null>(null);
  const [version, setVersion] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  // Tab into the matrix lands on today: the day logged most often.
  const [focus, setFocus] = useState<[number, number]>(() => [
    0,
    Number(today.slice(8)) - 1,
  ]);
  const grid = useRef<HTMLTableElement>(null);

  useEffect(() => {
    let current = true;
    Promise.all([listHabits(db), listLogs(db), listPauses(db)]).then(
      ([habits, logs, pauses]) => current && setData({ habits, logs, pauses }),
      () => current && setNotice(cs.loadError),
    );
    return () => {
      current = false;
    };
  }, [db, dataVersion, version]);

  const first = `${month}-01`;
  const last = addDays(`${shiftMonth(month, 1)}-01`, -1);
  const days: string[] = [];
  for (let d = first; d <= last; d = addDays(d, 1)) days.push(d);

  const habits = data?.habits.filter((h) => !h.archived_at) ?? [];
  const rows = habits.map((habit) => {
    const pauses = data?.pauses.filter((p) => p.habit_id === habit.id) ?? [];
    const logs = data?.logs.filter((l) => l.habit_id === habit.id) ?? [];
    return {
      habit,
      pauses,
      logs,
      statuses: dayStatuses(habit, pauses, logs, first, last, today),
      ...habitStreak(habit, pauses, logs, today),
    };
  });

  async function cycle(row: (typeof rows)[number], date: string) {
    // "Today" at the moment of the click, not of the render (council F3).
    const now = todayLocal(new Date());
    const { habit } = row;
    if (!isScheduled(habit, row.pauses, date)) return;
    const current = row.logs.find((l) => l.date === date)?.status ?? null;
    const when = date < now ? "past" : date === now ? "today" : "future";
    const hasMinimum =
      habit.type === "check"
        ? habit.min_version !== null
        : habit.min_value !== null;
    const next = nextCellStatus(current, when, hasMinimum);
    // Count/duration: done stores the target, minimum the minimum (PRD v0.7).
    const value =
      next === "done"
        ? habit.target_value
        : next === "minimum"
          ? habit.min_value
          : null;
    setNotice(null);
    try {
      const result = await setLog(db, habit.id, date, next, value, now);
      if (result === "past_rest") setNotice(t.pastRest);
      setVersion((v) => v + 1);
    } catch {
      setNotice(cs.saveError);
    }
  }

  // Roving tabindex: one Tab stop for the whole matrix, arrows move inside.
  function onGridKey(event: KeyboardEvent) {
    const moves: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    const r = Math.max(0, Math.min(rows.length - 1, focus[0] + move[0]));
    const c = Math.max(0, Math.min(days.length - 1, focus[1] + move[1]));
    setFocus([r, c]);
    grid.current
      ?.querySelector<HTMLButtonElement>(`[data-cell="${r}-${c}"]`)
      ?.focus();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn"
          aria-label={cs.finance.previousMonth}
          onClick={() => setMonth((m) => shiftMonth(m, -1))}
        >
          ‹
        </button>
        <h2 className="min-w-40 text-center text-2xl font-semibold">
          {formatMonth(month)}
        </h2>
        <button
          type="button"
          className="btn"
          aria-label={cs.finance.nextMonth}
          onClick={() => setMonth((m) => shiftMonth(m, 1))}
        >
          ›
        </button>
        <button
          type="button"
          className="btn btn-primary ml-auto"
          onClick={props.onAdd}
        >
          {t.add}
        </button>
      </div>

      {notice && (
        <p role="alert" className="text-danger">
          {notice}
        </p>
      )}

      {data && habits.length === 0 && (
        <p className="text-text-muted">{t.empty}</p>
      )}

      {habits.length > 0 && (
        <div className="overflow-x-auto">
          <table
            ref={grid}
            aria-label={t.matrix}
            onKeyDown={onGridKey}
            className="border-separate border-spacing-0.5"
          >
            <thead>
              <tr>
                <th />
                {days.map((day) => (
                  <th
                    key={day}
                    scope="col"
                    className={`w-7 text-xs font-normal ${day === today ? "text-text" : "text-text-muted"}`}
                  >
                    {Number(day.slice(8))}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={row.habit.id}>
                  <th
                    scope="row"
                    className="sticky left-0 bg-bg pr-3 text-left font-normal whitespace-nowrap"
                  >
                    <span>
                      {row.habit.icon} {row.habit.name}
                    </span>
                    <span className="block text-sm text-text-muted">
                      {t.streak(row.streak, false)}
                      {row.atRisk && (
                        <span className="text-warning"> · {t.atRisk}</span>
                      )}
                      {row.habit.phase === "established" && (
                        <span className="text-success"> · {t.established}</span>
                      )}
                    </span>
                  </th>
                  {days.map((day, c) => {
                    const status = row.statuses.get(day) ?? "unscheduled";
                    const look = cellLook[status];
                    return (
                      <td key={day}>
                        <button
                          type="button"
                          data-cell={`${r}-${c}`}
                          tabIndex={focus[0] === r && focus[1] === c ? 0 : -1}
                          onFocus={() => setFocus([r, c])}
                          onClick={() => void cycle(row, day)}
                          aria-label={t.cell(
                            row.habit.name,
                            formatDate(day),
                            t.status[status],
                          )}
                          className={`size-7 rounded text-sm ${look.className} ${day === today ? "ring-1 ring-text-muted" : ""}`}
                        >
                          {look.symbol}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
