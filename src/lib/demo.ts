// PUB-04 demo data for screenshots. Used only by scripts/demo.ts, never by the app.
// No runtime imports: Node runs the script directly (type stripping), and only
// type imports are erased.
import type { CategoryKind } from "../db/categories";
import type { TransactionInput } from "../db/transactions";

/** Total monthly budget of the demo, in haléře (15 000 Kč). */
export const DEMO_BUDGET = 1500000;

/** Demo limits by category name (haléře), chosen so the bars show all 3 colors. */
export const DEMO_LIMITS: Record<string, number> = {
  Jídlo: 600000,
  "Jídlo venku": 80000,
  Doprava: 80000,
  Zábava: 150000,
};

/**
 * Path of the DEV database, where plugin-sql keeps it (Tauri app_config_dir).
 * Refuses any identifier that is not the dev one (PUB-03): demo data must
 * never reach real data.
 */
export function devDbPath(
  platform: string,
  env: Record<string, string | undefined>,
  identifier: string,
): string {
  if (!identifier.endsWith(".dev"))
    throw new Error(
      `Demo data jdou jen do vývojové DB (identifier končí na .dev), ne do ${identifier}.`,
    );
  if (platform === "linux") {
    const base = env.XDG_CONFIG_HOME || (env.HOME && `${env.HOME}/.config`);
    if (!base) throw new Error("Chybí HOME, složku s daty nejde určit.");
    return `${base}/${identifier}/life-os.db`;
  }
  if (platform === "win32") {
    if (!env.APPDATA)
      throw new Error("Chybí APPDATA, složku s daty nejde určit.");
    return `${env.APPDATA}\\${identifier}\\life-os.db`;
  }
  throw new Error(`Systém ${platform} demo skript nepodporuje.`);
}

interface DemoCategory {
  id: number;
  name: string;
  kind: CategoryKind;
}

interface Rule {
  category: string;
  // day of month, month position (0 = two months ago, 2 = this month)
  on: (day: number, month: number) => boolean;
  amount: (day: number, month: number) => number;
  note?: string;
}

// Made-up spending of a student. No randomness: the same day gives the same data.
const RULES: Rule[] = [
  {
    category: "Jídlo",
    on: (day) => day % 2 === 0,
    amount: (day, month) => 15000 + ((day * 37 + month * 11) % 25) * 1000,
  },
  {
    category: "Jídlo venku",
    on: (day) => day % 6 === 3,
    amount: (day) => 21900 + (day % 3) * 4000,
  },
  {
    category: "Doprava",
    on: (day) => day === 1,
    amount: () => 55000,
    note: "měsíční jízdenka",
  },
  { category: "Doprava", on: (day) => day % 9 === 4, amount: () => 4900 },
  {
    category: "Zábava",
    on: (day) => day === 12 || day === 24,
    amount: (_day, month) => 34900 + month * 5000,
  },
  {
    category: "Předplatné",
    on: (day) => day === 3,
    amount: () => 25900,
    note: "streaming",
  },
  { category: "Sport a gym", on: (day) => day === 2, amount: () => 89000 },
  {
    category: "Oblečení",
    on: (day, month) => day === 15 && month === 0,
    amount: () => 129000,
  },
  { category: "Ostatní", on: (day) => day === 20, amount: () => 15000 },
  {
    category: "Práce / zakázky",
    on: (day) => day === 10,
    amount: () => 1800000,
    note: "faktura",
  },
  {
    category: "Práce / zakázky",
    on: (day) => day === 25,
    amount: () => 650000,
  },
  {
    category: "Ostatní příjmy",
    on: (day, month) => day === 18 && month === 1,
    amount: () => 50000,
    note: "dárek",
  },
];

const pad = (n: number) => String(n).padStart(2, "0");

/** Transactions for the current month up to today and the 2 months before. */
export function demoTransactions(
  today: string,
  categories: DemoCategory[],
): TransactionInput[] {
  const ids = new Map(categories.map((c) => [c.name, c.id]));
  const [year, month, todayDay] = today.split("-").map(Number);
  const result: TransactionInput[] = [];

  for (let position = 0; position < 3; position++) {
    const index = year * 12 + (month - 1) - (2 - position);
    const y = Math.floor(index / 12);
    const m = (index % 12) + 1;
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const lastDay = position === 2 ? todayDay : daysInMonth;

    for (let day = 1; day <= lastDay; day++) {
      for (const rule of RULES) {
        const categoryId = ids.get(rule.category);
        if (categoryId === undefined || !rule.on(day, position)) continue;
        result.push({
          date: `${y}-${pad(m)}-${pad(day)}`,
          amount: rule.amount(day, position),
          category_id: categoryId,
          note: rule.note ?? null,
        });
      }
    }
  }
  return result;
}
