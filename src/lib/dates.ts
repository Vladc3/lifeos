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
