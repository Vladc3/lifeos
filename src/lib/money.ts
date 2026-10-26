// Money is always integer haléře (CLAUDE.md). Parsing works on the text,
// never through a float: 0.29 * 100 would give 28.999…

// Comma and dot are both the decimal separator (FIN-01), so "1.234" is
// 3 decimals and invalid. Spaces (incl. NBSP from formatMoney) group thousands.
const AMOUNT = /^(\d+)(?:[.,](\d{1,2}))?$/;

/** Amount typed by the user → haléře, or null when it is not a valid amount > 0. */
export function parseAmount(input: string): number | null {
  const match = AMOUNT.exec(input.replace(/\s/g, ""));
  if (!match) return null;
  const [, crowns, fraction = ""] = match;
  const halere = Number(crowns) * 100 + Number(fraction.padEnd(2, "0"));
  return halere > 0 && Number.isSafeInteger(halere) ? halere : null;
}

/** 123450 → "1 234,50 Kč", 100000 → "1 000 Kč" (NBSP, Intl cs-CZ). */
export function formatMoney(halere: number): string {
  const digits = halere % 100 === 0 ? 0 : 2;
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(halere / 100);
}
