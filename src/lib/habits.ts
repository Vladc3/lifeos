// Habit rules from PRD kap. 6 (CALC-01 to CALC-06) as pure functions.
// "today" is always a parameter. dayStatuses is the single source of what a
// day was; streak (and later consistency and phase) only read from it.
import { addDays, isoWeekday } from "./dates";

export type Frequency = "daily" | "days" | "weekly_count";
export type LogStatus = "done" | "minimum" | "missed" | "rest";
export type DayStatus = LogStatus | "pending" | "unscheduled";

export interface HabitRule {
  frequency: Frequency;
  days_mask: number | null; // bit 0 = Monday … bit 6 = Sunday
  weekly_target: number | null;
  start_date: string; // local YYYY-MM-DD (PRD v0.7, C1)
}

export interface Pause {
  start_date: string;
  end_date: string | null; // null = still paused
}

export interface HabitLog {
  date: string;
  status: LogStatus;
  value: number | null;
}

const isSuccess = (status: DayStatus) =>
  status === "done" || status === "minimum";

function isPaused(pauses: Pause[], date: string): boolean {
  return pauses.some(
    (p) => date >= p.start_date && (p.end_date === null || date <= p.end_date),
  );
}

/** CALC-01. weekly_count has no scheduled days, it is judged by weeks. */
export function isScheduled(
  habit: HabitRule,
  pauses: Pause[],
  date: string,
): boolean {
  if (date < habit.start_date || isPaused(pauses, date)) return false;
  if (habit.frequency === "daily") return true;
  if (habit.frequency === "days")
    return (((habit.days_mask ?? 0) >> (isoWeekday(date) - 1)) & 1) === 1;
  return false;
}

/**
 * CALC-02: the state of every day from `from` to `to`. Logs on days that are
 * not scheduled (e.g. after a frequency change) are ignored. A past scheduled
 * day without a success or rest is missed; today and future days are pending.
 */
export function dayStatuses(
  habit: HabitRule,
  pauses: Pause[],
  logs: HabitLog[],
  from: string,
  to: string,
  today: string,
): Map<string, DayStatus> {
  const logged = new Map(logs.map((log) => [log.date, log.status]));
  const result = new Map<string, DayStatus>();
  for (let date = from; date <= to; date = addDays(date, 1)) {
    const status = logged.get(date);
    if (!isScheduled(habit, pauses, date)) result.set(date, "unscheduled");
    else if (status === "done" || status === "minimum" || status === "rest")
      result.set(date, status);
    else result.set(date, date < today ? "missed" : "pending");
  }
  return result;
}

/**
 * CALC-02 + CALC-03 (nikdy dvakrát): successes in a row back from today.
 * Rest, unscheduled days and today's pending are skipped. One miss keeps the
 * streak but puts the habit at risk; two misses in a row end it.
 */
export function habitStreak(
  habit: HabitRule,
  pauses: Pause[],
  logs: HabitLog[],
  today: string,
): { streak: number; atRisk: boolean } {
  const days = [
    ...dayStatuses(
      habit,
      pauses,
      logs,
      habit.start_date,
      today,
      today,
    ).values(),
  ].reverse();
  let streak = 0;
  let missesInRow = 0;
  let atRisk = false;
  let judged = false; // has the walk met a success or a miss yet
  for (const status of days) {
    if (isSuccess(status)) {
      streak++;
      missesInRow = 0;
      judged = true;
    } else if (status === "missed") {
      if (!judged) atRisk = true;
      judged = true;
      if (++missesInRow === 2) return { streak, atRisk: atRisk && streak > 0 };
    }
  }
  return { streak, atRisk };
}

/**
 * HAB-03 click cycle (PRD v0.7): empty → done → minimum → empty. A past empty
 * day already means missed, so missed has no own step. Rest only for today
 * and future scheduled days, never for weekly_count. null = no log.
 */
export function nextCellStatus(
  current: LogStatus | null,
  when: "past" | "today" | "future",
  hasMinimum: boolean,
  weekly = false,
): LogStatus | null {
  const order: (LogStatus | null)[] =
    when === "future"
      ? weekly
        ? [null]
        : [null, "rest"]
      : [
          null,
          "done",
          ...(hasMinimum ? (["minimum"] as const) : []),
          ...(when === "today" && !weekly ? (["rest"] as const) : []),
        ];
  const index = order.indexOf(current === "missed" ? null : current);
  return index === -1 ? null : order[(index + 1) % order.length];
}
