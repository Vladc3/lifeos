// Dates are YYYY-MM-DD in local time, months YYYY-MM (CLAUDE.md).
// "Now" is always a parameter: only the UI calls new Date().

const pad = (n: number) => String(n).padStart(2, "0");

/** Local calendar day. Not toISOString(): that is UTC, so 00:30 in Prague would be yesterday. */
export function todayLocal(now: Date): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** YYYY-MM-DD of a day that exists (2026-02-30 does not), like the DB CHECK. */
export function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [year, m, d] = date.split("-").map(Number);
  const day = new Date(Date.UTC(year, m - 1, d));
  return day.getUTCMonth() === m - 1 && day.getUTCDate() === d;
}

export function monthOf(date: string): string {
  return date.slice(0, 7);
}

export function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number);
  const index = year * 12 + (m - 1) + delta;
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`;
}

/** "2026-10" → "říjen 2026" */
export function formatMonth(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("cs-CZ", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, m - 1, 1));
}

/** "2026-10-05" → "5. 10. 2026" */
export function formatDate(date: string): string {
  const [year, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("cs-CZ").format(new Date(year, m - 1, d));
}

// Day arithmetic on YYYY-MM-DD through UTC: no daylight-saving shifts.
const utc = (date: string) => {
  const [year, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(year, m - 1, d));
};
const iso = (day: Date) => day.toISOString().slice(0, 10);

export function addDays(date: string, days: number): string {
  const day = utc(date);
  day.setUTCDate(day.getUTCDate() + days);
  return iso(day);
}

/** 1 = Monday … 7 = Sunday (ISO, week starts on Monday). */
export function isoWeekday(date: string): number {
  return ((utc(date).getUTCDay() + 6) % 7) + 1;
}

/** Monday of the ISO week the date is in. */
export function weekStart(date: string): string {
  return addDays(date, 1 - isoWeekday(date));
}

/** Whole days from `from` to `to` (0 for the same day). */
export function daysBetween(from: string, to: string): number {
  return Math.round((utc(to).getTime() - utc(from).getTime()) / 86_400_000);
}
