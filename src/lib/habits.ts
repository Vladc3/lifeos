// Habit rules from PRD kap. 6 (CALC-01 to CALC-06) as pure functions.
// "today" is always a parameter. dayStatuses is the single source of what a
// day was; streak (and later consistency and phase) only read from it.
import { addDays, daysBetween, isoWeekday, weekStart } from "./dates";

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
 * Days that can take a log: scheduled days, or for weekly_count any active
 * day up to today (it has no rest, so a future day takes nothing).
 */
export function isLoggable(
  habit: HabitRule,
  pauses: Pause[],
  date: string,
  today: string,
): boolean {
  if (habit.frequency !== "weekly_count")
    return isScheduled(habit, pauses, date);
  return date >= habit.start_date && date <= today && !isPaused(pauses, date);
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
  const weekly = habit.frequency === "weekly_count";
  for (let date = from; date <= to; date = addDays(date, 1)) {
    const status = logged.get(date);
    if (!isLoggable(habit, pauses, date, today))
      result.set(date, "unscheduled");
    // weekly_count: a day is never missed, only the week is (P6)
    else if (weekly)
      result.set(
        date,
        status === "done" || status === "minimum" ? status : "pending",
      );
    else if (status === "done" || status === "minimum" || status === "rest")
      result.set(date, status);
    else result.set(date, date < today ? "missed" : "pending");
  }
  return result;
}

type Judged = "success" | "missed" | "skip";

/**
 * CALC-03 (nikdy dvakrát) over days or weeks, oldest first: successes in a row
 * back from now. One miss keeps the streak but puts it at risk; two misses in
 * a row end it. Skipped items (rest, unscheduled, pending) neither help nor hurt.
 */
function neverTwice(items: Judged[]): { streak: number; atRisk: boolean } {
  let streak = 0;
  let missesInRow = 0;
  let atRisk = false;
  let judged = false; // has the walk met a success or a miss yet
  for (const item of [...items].reverse()) {
    if (item === "success") {
      streak++;
      missesInRow = 0;
      judged = true;
    } else if (item === "missed") {
      if (!judged) atRisk = true;
      judged = true;
      if (++missesInRow === 2) break;
    }
  }
  // At risk only with something to lose (a streak of 0 can't be at risk).
  return { streak, atRisk: atRisk && streak > 0 };
}

const judgeDay = (status: DayStatus): Judged =>
  isSuccess(status) ? "success" : status === "missed" ? "missed" : "skip";

/**
 * weekly_count: a week succeeds with ≥ weekly_target successes. The current
 * week, the week of the start and a week with a pause count only when done
 * (PRD v0.7, P6): otherwise they are skipped, not missed.
 */
function weekResults(
  habit: HabitRule,
  pauses: Pause[],
  logs: HabitLog[],
  today: string,
): { monday: string; successes: number; judged: Judged }[] {
  const done = new Set(
    logs
      .filter(
        (l) =>
          (l.status === "done" || l.status === "minimum") &&
          l.date <= today &&
          isLoggable(habit, pauses, l.date, today),
      )
      .map((l) => l.date),
  );
  const target = habit.weekly_target ?? 1;
  const thisWeek = weekStart(today);
  const weeks = [];
  for (
    let monday = weekStart(habit.start_date);
    monday <= thisWeek;
    monday = addDays(monday, 7)
  ) {
    let successes = 0;
    let partial = monday < habit.start_date;
    for (let d = 0; d < 7; d++) {
      const date = addDays(monday, d);
      if (done.has(date)) successes++;
      if (date >= habit.start_date && isPaused(pauses, date)) partial = true;
    }
    const judged: Judged =
      successes >= target
        ? "success"
        : monday === thisWeek || partial
          ? "skip"
          : "missed";
    weeks.push({ monday, successes, judged });
  }
  return weeks;
}

/**
 * CALC-02 + CALC-03: the streak in days, for weekly_count in weeks.
 * Rest, unscheduled days and today's pending are skipped.
 */
export function habitStreak(
  habit: HabitRule,
  pauses: Pause[],
  logs: HabitLog[],
  today: string,
): { streak: number; atRisk: boolean } {
  if (habit.frequency === "weekly_count")
    return neverTwice(
      weekResults(habit, pauses, logs, today).map((w) => w.judged),
    );
  const days = dayStatuses(habit, pauses, logs, habit.start_date, today, today);
  return neverTwice([...days.values()].map(judgeDay));
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

/**
 * CALC-02 for count/duration: value ≥ target = done, min ≤ value < target =
 * minimum, otherwise missed. Called only when a log is written, so changing
 * the target later does not rewrite history (PRD v0.7, P3).
 */
export function statusForValue(
  value: number,
  target: number,
  min: number | null,
): LogStatus {
  if (value >= target) return "done";
  return min !== null && value >= min ? "minimum" : "missed";
}

/**
 * CALC-04: successful scheduled days ÷ scheduled days in the window, up to
 * yesterday (today only once it is a success), rest days left out, rounded
 * to whole %. null when there is no such day ("–").
 */
export function consistency(
  habit: HabitRule,
  pauses: Pause[],
  logs: HabitLog[],
  from: string,
  to: string,
  today: string,
): number | null {
  let scheduled = 0;
  let successes = 0;
  for (const [date, status] of dayStatuses(
    habit,
    pauses,
    logs,
    from,
    to,
    today,
  )) {
    if (date > today || status === "rest" || status === "unscheduled") continue;
    if (date === today && !isSuccess(status)) continue;
    scheduled++;
    if (isSuccess(status)) successes++;
  }
  return scheduled === 0 ? null : Math.round((successes / scheduled) * 100);
}

const ESTABLISH_DAYS = 66;
const ESTABLISH_WEEKS = 9;

/** Whole ISO weeks (Monday–Sunday) between the start and the current week. */
function fullWeeks(habit: HabitRule, today: string): number {
  const first =
    isoWeekday(habit.start_date) === 1
      ? habit.start_date
      : addDays(weekStart(habit.start_date), 7);
  return Math.max(0, Math.floor(daysBetween(first, weekStart(today)) / 7));
}

/** CALC-05: ≥ 66 days since start and ≥ 80 % over the last 66 days. */
export function reachesEstablished(
  habit: HabitRule,
  pauses: Pause[],
  logs: HabitLog[],
  today: string,
): boolean {
  if (habit.frequency === "weekly_count") {
    // ≥ 9 full ISO weeks and average weekly consistency ≥ 80 % over the last 9
    if (fullWeeks(habit, today) < ESTABLISH_WEEKS) return false;
    const target = habit.weekly_target ?? 1;
    const lastNine = weekResults(habit, pauses, logs, today)
      .slice(0, -1) // the current week is not full
      .slice(-ESTABLISH_WEEKS);
    // ponytail: pauses inside these weeks are not discounted; a paused week lowers the average
    const average =
      lastNine.reduce(
        (sum, w) => sum + Math.min(w.successes, target) / target,
        0,
      ) / ESTABLISH_WEEKS;
    return Math.round(average * 100) >= 80;
  }
  if (daysBetween(habit.start_date, today) < ESTABLISH_DAYS) return false;
  const from = addDays(today, -(ESTABLISH_DAYS - 1));
  return (consistency(habit, pauses, logs, from, today, today) ?? 0) >= 80;
}

/**
 * HAB-05: days until the habit is 66 days old, for weekly_count weeks until
 * 9 full weeks (0 = only the 80 % consistency is missing, PRD v0.7 P7).
 */
export function establishGap(habit: HabitRule, today: string): number {
  if (habit.frequency === "weekly_count")
    return Math.max(0, ESTABLISH_WEEKS - fullWeeks(habit, today));
  return Math.max(0, ESTABLISH_DAYS - daysBetween(habit.start_date, today));
}

/** HAB-05: which building habit becomes established first (compared in days). */
export function nearestToEstablish(
  habits: (HabitRule & { name: string })[],
  today: string,
): { name: string; gap: number; weeks: boolean } | null {
  let nearest: { name: string; gap: number; weeks: boolean } | null = null;
  const inDays = (n: { gap: number; weeks: boolean }) =>
    n.weeks ? n.gap * 7 : n.gap;
  for (const habit of habits) {
    const candidate = {
      name: habit.name,
      gap: establishGap(habit, today),
      weeks: habit.frequency === "weekly_count",
    };
    if (!nearest || inDays(candidate) < inDays(nearest)) nearest = candidate;
  }
  return nearest;
}
