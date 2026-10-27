import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  archiveHabit,
  listHabits,
  listLogs,
  listPauses,
  pauseHabit,
  restoreHabit,
  resumeHabit,
  setLog,
  syncPhases,
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
  statusForValue,
  type DayStatus,
} from "../../lib/habits";
import { dialogClass, useModalDialog } from "../useModalDialog";
import { limitMessage } from "./HabitDialog";

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
  onEdit: (habit: Habit) => void;
}) {
  const { db, dataVersion } = props;
  const today = todayLocal(new Date());
  const [month, setMonth] = useState(() => monthOf(today));
  const [data, setData] = useState<Data | null>(null);
  const [version, setVersion] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  // HAB-06 / P4: shown once, the phase change is stored only once.
  const [established, setEstablished] = useState<string[]>([]);
  // Tab into the matrix lands on today: the day logged most often.
  const [focus, setFocus] = useState<[number, number]>(() => [
    0,
    Number(today.slice(8)) - 1,
  ]);
  const grid = useRef<HTMLTableElement>(null);
  // Exact value of a count/duration day (PRD v0.7: right click or Shift+Enter).
  const [valueFor, setValueFor] = useState<{
    row: Row;
    date: string;
  } | null>(null);

  useEffect(() => {
    let current = true;
    // CALC-05 first, so the matrix and the limit read the current phase.
    async function load() {
      const names = await syncPhases(db, todayLocal(new Date()));
      const [habits, logs, pauses] = await Promise.all([
        listHabits(db),
        listLogs(db),
        listPauses(db),
      ]);
      if (!current) return;
      if (names.length > 0) setEstablished((shown) => [...shown, ...names]);
      setData({ habits, logs, pauses });
    }
    load().catch(() => current && setNotice(cs.loadError));
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

  type Row = (typeof rows)[number];

  const isPaused = (row: Row) => row.pauses.some((p) => p.end_date === null);

  // HAB-02 actions. Resume and restore may hit the limit (CALC-06, P7).
  async function act(action: () => Promise<unknown>) {
    setNotice(null);
    const today = todayLocal(new Date());
    try {
      await syncPhases(db, today);
      if ((await action()) === "limit")
        setNotice(await limitMessage(db, today));
      setVersion((v) => v + 1);
    } catch {
      setNotice(cs.saveError);
    }
  }

  function openValue(row: Row, date: string) {
    if (row.habit.type === "check" || !isScheduled(row.habit, row.pauses, date))
      return;
    setValueFor({ row, date });
  }

  async function saveValue(row: Row, date: string, value: number) {
    const { habit } = row;
    const now = todayLocal(new Date());
    // statusForValue only here, when writing: a later target change keeps history.
    const status =
      value === 0
        ? null
        : statusForValue(value, habit.target_value ?? 0, habit.min_value);
    try {
      await setLog(db, habit.id, date, status, status ? value : null, now);
      setValueFor(null);
      setVersion((v) => v + 1);
    } catch {
      setNotice(cs.saveError);
    }
  }

  async function cycle(row: Row, date: string) {
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

      {established.map((name) => (
        <p key={name} role="status" className="text-success">
          {t.establishedNotice(name)}
        </p>
      ))}
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
                      {isPaused(row) && <span> · {t.paused}</span>}
                    </span>
                    <span className="flex gap-2 text-sm">
                      <button
                        type="button"
                        className="underline"
                        onClick={() => props.onEdit(row.habit)}
                      >
                        {t.edit}
                      </button>
                      <button
                        type="button"
                        className="underline"
                        onClick={() => {
                          const today = todayLocal(new Date());
                          void act(() =>
                            isPaused(row)
                              ? resumeHabit(db, row.habit.id, today)
                              : pauseHabit(db, row.habit.id, today),
                          );
                        }}
                      >
                        {isPaused(row) ? t.resume : t.pause}
                      </button>
                      <button
                        type="button"
                        className="underline"
                        onClick={() =>
                          void act(() =>
                            archiveHabit(
                              db,
                              row.habit.id,
                              todayLocal(new Date()),
                            ),
                          )
                        }
                      >
                        {t.archive}
                      </button>
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
                          onContextMenu={(event) => {
                            event.preventDefault();
                            openValue(row, day);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" && event.shiftKey) {
                              event.preventDefault();
                              openValue(row, day);
                            }
                          }}
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

      {data && data.habits.some((h) => h.archived_at) && (
        <section className="space-y-2">
          <h3 className="label">{t.archivedList}</h3>
          <ul className="divide-y divide-border rounded-md border border-border">
            {data.habits
              .filter((h) => h.archived_at)
              .map((habit) => (
                <li key={habit.id} className="flex items-center gap-3 p-3">
                  <span className="flex-1">
                    {habit.icon} {habit.name}
                  </span>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => void act(() => restoreHabit(db, habit.id))}
                  >
                    {t.restore}
                  </button>
                </li>
              ))}
          </ul>
        </section>
      )}

      {valueFor && (
        <ValueDialog
          title={t.valueTitle(
            valueFor.row.habit.name,
            formatDate(valueFor.date),
          )}
          unit={valueFor.row.habit.unit}
          initial={
            valueFor.row.logs.find((l) => l.date === valueFor.date)?.value ??
            null
          }
          onClose={() => setValueFor(null)}
          onSave={(value) => void saveValue(valueFor.row, valueFor.date, value)}
        />
      )}
    </div>
  );
}

function ValueDialog(props: {
  title: string;
  unit: string | null;
  initial: number | null;
  onClose: () => void;
  onSave: (value: number) => void;
}) {
  const { ref, onCancel } = useModalDialog(props.onClose);
  const [text, setText] = useState(
    props.initial === null ? "" : String(props.initial),
  );
  const [error, setError] = useState(false);

  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!/^\d+$/.test(trimmed)) {
      setError(true);
      return;
    }
    props.onSave(Number(trimmed));
  }

  return (
    <dialog ref={ref} onCancel={onCancel} className={dialogClass}>
      <form onSubmit={submit} className="space-y-4">
        <h2 className="text-lg font-semibold">{props.title}</h2>
        <label className="block">
          <span className="label">{t.value(props.unit)}</span>
          <input
            data-autofocus
            inputMode="numeric"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="field text-2xl"
          />
          <span className="text-sm text-text-muted">{t.valueHint}</span>
        </label>
        {error && (
          <p role="alert" className="text-danger">
            {t.valueError}
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
