import type { HabitInput, HabitType } from "../db/habits";
import type { Frequency } from "./habits";

/** Habit dialog fields as typed (HAB-01). */
export interface HabitFormValues {
  name: string;
  icon: string;
  identity: string;
  type: HabitType;
  target: string;
  unit: string;
  frequency: Frequency;
  daysMask: number; // bit 0 = Monday
  weeklyTarget: string;
  anchor: string;
  minVersion: string;
  minValue: string;
}

export type HabitFormResult =
  | { ok: true; value: HabitInput }
  | {
      ok: false;
      error: "name" | "icon" | "target" | "min" | "days" | "weekly";
    };

export const emptyHabitForm: HabitFormValues = {
  name: "",
  icon: "✅",
  identity: "",
  type: "check",
  target: "",
  unit: "",
  frequency: "daily",
  daysMask: 0,
  weeklyTarget: "",
  anchor: "",
  minVersion: "",
  minValue: "",
};

/** HAB-09: templates from PRD kap. 10 ("Den bez utrácení" comes with HAB-10). */
export const HABIT_TEMPLATES: (HabitFormValues & { name: string })[] = [
  {
    ...emptyHabitForm,
    name: "Spánek do 23:00",
    icon: "😴",
    minVersion: "do 23:30",
  },
  {
    ...emptyHabitForm,
    name: "Trénink",
    icon: "🏋️",
    type: "duration",
    target: "45",
    unit: "min",
    frequency: "weekly_count",
    weeklyTarget: "4",
    minVersion: "10 minut pohybu",
    minValue: "10",
  },
  {
    ...emptyHabitForm,
    name: "Učení",
    icon: "🎓",
    type: "duration",
    target: "90",
    unit: "min",
    frequency: "days",
    daysMask: 0b0001111, // Po–Čt
    minVersion: "15 minut",
    minValue: "15",
  },
  {
    ...emptyHabitForm,
    name: "Čtení",
    icon: "📖",
    type: "count",
    target: "10",
    unit: "stran",
    minVersion: "1 strana",
    minValue: "1",
  },
  {
    ...emptyHabitForm,
    name: "Pitný režim",
    icon: "💧",
    type: "count",
    target: "8",
    unit: "sklenic",
    minVersion: "4 sklenice",
    minValue: "4",
  },
];

const whole = (text: string) =>
  /^\d+$/.test(text.trim()) ? Number(text.trim()) : null;
const textOrNull = (text: string) => text.trim() || null;

/** HAB-01 validation at the UI → DB boundary (NFR-07). */
export function validateHabitForm(values: HabitFormValues): HabitFormResult {
  const name = values.name.trim();
  if (name.length < 1 || name.length > 40) return { ok: false, error: "name" };
  const icon = values.icon.trim();
  if (!icon) return { ok: false, error: "icon" };

  let target: number | null = null;
  let minValue: number | null = null;
  if (values.type !== "check") {
    target = whole(values.target);
    if (target === null || target <= 0) return { ok: false, error: "target" };
    if (values.minValue.trim()) {
      minValue = whole(values.minValue);
      if (minValue === null || minValue <= 0 || minValue >= target)
        return { ok: false, error: "min" };
    }
  }

  const daysMask = values.frequency === "days" ? values.daysMask : null;
  if (daysMask !== null && (daysMask < 1 || daysMask > 127))
    return { ok: false, error: "days" };
  const weeklyTarget =
    values.frequency === "weekly_count" ? whole(values.weeklyTarget) : null;
  if (
    values.frequency === "weekly_count" &&
    (weeklyTarget === null || weeklyTarget < 1 || weeklyTarget > 7)
  )
    return { ok: false, error: "weekly" };

  return {
    ok: true,
    value: {
      name,
      icon,
      identity: textOrNull(values.identity),
      type: values.type,
      target_value: target,
      unit: values.type === "check" ? null : textOrNull(values.unit),
      frequency: values.frequency,
      days_mask: daysMask,
      weekly_target: weeklyTarget,
      anchor: textOrNull(values.anchor),
      min_version: textOrNull(values.minVersion),
      min_value: minValue,
    },
  };
}
