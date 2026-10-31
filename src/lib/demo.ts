// PUB-04 demo data for screenshots. Used only by scripts/demo.ts, never by the app.
// No runtime imports: Node runs the script directly (type stripping), and only
// type imports are erased.
import type { CategoryKind } from "../db/categories";
import type { TransactionInput } from "../db/transactions";
import type { HabitInput } from "../db/habits";

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

const shiftedMonth = (today: string, delta: number) => {
  const [year, month] = today.split("-").map(Number);
  const index = year * 12 + (month - 1) + delta;
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`;
};

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

export interface DemoRecurring {
  name: string;
  amount: number;
  category_id: number;
  day_of_month: number;
  first_month: string;
}

/** Plan F4, E13: day 5 has no other demo expense. The app generates the transactions. */
export function demoRecurring(
  today: string,
  categories: DemoCategory[],
): DemoRecurring[] {
  const category = categories.find((c) => c.name === "Předplatné");
  if (!category) return [];
  return [
    {
      name: "Předplatné",
      amount: 25900,
      category_id: category.id,
      day_of_month: 5,
      first_month: shiftedMonth(today, -2),
    },
  ];
}

export interface DemoGoal {
  type: "saving";
  name: string;
  icon: string;
  target_amount: number;
  deadline: string;
  priority: number;
  deposits: { date: string; amount: number }[];
}

/** Dates are the 1st of a month: "today + 6 months" would overflow on the 31st. */
export function demoGoals(today: string): DemoGoal[] {
  return [
    {
      type: "saving",
      name: "Dovolená",
      icon: "🏖️",
      target_amount: 3000000,
      deadline: `${shiftedMonth(today, 6)}-01`,
      priority: 1,
      deposits: [{ date: `${shiftedMonth(today, -1)}-01`, amount: 500000 }],
    },
    {
      type: "saving",
      name: "Kurz",
      icon: "🎓",
      target_amount: 200000,
      deadline: `${shiftedMonth(today, -1)}-01`,
      priority: 2,
      deposits: [{ date: `${shiftedMonth(today, -1)}-01`, amount: 150000 }],
    },
  ];
}

export interface DemoHabit {
  habit: HabitInput & {
    start_date: string;
    phase: "building" | "established";
  };
  logs: { date: string; status: "done" | "minimum"; value: number | null }[];
}

const shift = (date: string, days: number) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};
const weekday = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return ((new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7) + 1; // 1 = Monday
};
const base: Omit<HabitInput, "name" | "icon" | "type" | "frequency"> = {
  identity: null,
  target_value: null,
  unit: null,
  days_mask: null,
  weekly_target: null,
  anchor: null,
  min_version: null,
  min_value: null,
};
function daysFrom(from: string, to: string, keep: (date: string) => boolean) {
  const dates: string[] = [];
  for (let date = from; date <= to; date = shift(date, 1))
    if (keep(date)) dates.push(date);
  return dates;
}

/**
 * PUB-04 demo habits (plan F3, E10): Čtení with a 30-day streak, Trénink an
 * established weekly habit, Spánek at risk, Učení building but ready to be
 * established. 3 building = the CALC-06 limit is respected.
 */
export function demoHabits(today: string): DemoHabit[] {
  const yesterday = shift(today, -1);
  const reading = shift(today, -30);
  const sleep = shift(today, -20);
  const study = shift(today, -70);
  const thisMonday = shift(today, 1 - weekday(today));
  const training = shift(thisMonday, -12 * 7);
  return [
    {
      habit: {
        ...base,
        name: "Čtení",
        icon: "📖",
        type: "count",
        target_value: 10,
        unit: "stran",
        frequency: "daily",
        min_version: "1 strana",
        min_value: 1,
        start_date: reading,
        phase: "building",
      },
      logs: daysFrom(reading, yesterday, () => true).map((date, i) =>
        i % 7 === 3
          ? { date, status: "minimum", value: 4 }
          : { date, status: "done", value: 10 },
      ),
    },
    {
      habit: {
        ...base,
        name: "Trénink",
        icon: "🏋️",
        type: "duration",
        target_value: 45,
        unit: "min",
        frequency: "weekly_count",
        weekly_target: 4,
        min_version: "10 minut pohybu",
        min_value: 10,
        start_date: training,
        phase: "established",
      },
      // Mon, Tue, Thu, Sat every full week; this week stays empty for K12
      logs: daysFrom(training, shift(thisMonday, -1), (date) =>
        [1, 2, 4, 6].includes(weekday(date)),
      ).map((date) => ({ date, status: "done", value: 45 })),
    },
    {
      habit: {
        ...base,
        name: "Spánek do 23:00",
        icon: "😴",
        type: "check",
        frequency: "daily",
        min_version: "do 23:30",
        start_date: sleep,
        phase: "building",
      },
      // yesterday missed: at risk (K5)
      logs: daysFrom(sleep, shift(today, -2), () => true).map((date, i) => ({
        date,
        status: i % 5 === 2 ? "minimum" : "done",
        value: null,
      })),
    },
    {
      habit: {
        ...base,
        name: "Učení",
        icon: "🎓",
        type: "duration",
        target_value: 90,
        unit: "min",
        frequency: "days",
        days_mask: 0b0001111, // Po–Čt
        min_version: "15 minut",
        min_value: 15,
        start_date: study,
        phase: "building", // becomes established on the next sync (K9)
      },
      logs: daysFrom(study, yesterday, (date) => weekday(date) <= 4).map(
        (date) => ({ date, status: "done", value: 90 }),
      ),
    },
  ];
}
