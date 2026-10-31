import { describe, expect, it } from "vitest";
import {
  HABIT_TEMPLATES,
  emptyHabitForm,
  validateHabitForm,
  type HabitFormValues,
} from "./habitForm";

const reading: HabitFormValues = {
  ...emptyHabitForm,
  name: " Čtení ",
  icon: "📖",
  type: "count",
  target: "10",
  unit: "stran",
  minValue: "1",
};

describe("validateHabitForm (HAB-01, NFR-07)", () => {
  it("turns a count habit into input, empty texts into null", () => {
    expect(validateHabitForm(reading)).toEqual({
      ok: true,
      value: {
        name: "Čtení",
        icon: "📖",
        identity: null,
        type: "count",
        target_value: 10,
        unit: "stran",
        frequency: "daily",
        days_mask: null,
        weekly_target: null,
        anchor: null,
        min_version: null,
        min_value: 1,
      },
    });
  });

  it("drops target, unit and min value of a yes/no habit", () => {
    const result = validateHabitForm({
      ...reading,
      type: "check",
      minVersion: "do 23:30",
    });
    expect(result.ok && result.value).toMatchObject({
      type: "check",
      target_value: null,
      unit: null,
      min_value: null,
      min_version: "do 23:30",
    });
  });

  it("keeps only the field of the chosen frequency", () => {
    const days = validateHabitForm({
      ...reading,
      frequency: "days",
      daysMask: 0b0001111,
      weeklyTarget: "3",
    });
    expect(days.ok && [days.value.days_mask, days.value.weekly_target]).toEqual(
      [15, null],
    );
    const weekly = validateHabitForm({
      ...reading,
      frequency: "weekly_count",
      daysMask: 0b0001111,
      weeklyTarget: "4",
    });
    expect(
      weekly.ok && [weekly.value.days_mask, weekly.value.weekly_target],
    ).toEqual([null, 4]);
  });

  it("an empty min value means no minimum", () => {
    const result = validateHabitForm({ ...reading, minValue: " " });
    expect(result.ok && result.value.min_value).toBeNull();
  });

  it.each([
    ["name", { name: "  " }],
    ["name", { name: "x".repeat(41) }],
    ["icon", { icon: "" }],
    ["target", { target: "" }],
    ["target", { target: "0" }],
    ["target", { target: "1,5" }],
    ["min", { minValue: "10" }], // must be below the target
    ["min", { minValue: "0" }],
    ["days", { frequency: "days", daysMask: 0 }],
    ["weekly", { frequency: "weekly_count", weeklyTarget: "8" }],
    ["weekly", { frequency: "weekly_count", weeklyTarget: "" }],
  ] as const)("reports %s for %j", (error, change) => {
    expect(validateHabitForm({ ...reading, ...change })).toEqual({
      ok: false,
      error,
    });
  });
});

describe("HABIT_TEMPLATES (HAB-09, PRD kap. 10)", () => {
  it("has the 5 templates of phase 3 (no-spend day comes with HAB-10)", () => {
    expect(HABIT_TEMPLATES.map((t) => t.name)).toEqual([
      "Spánek do 23:00",
      "Trénink",
      "Učení",
      "Čtení",
      "Pitný režim",
    ]);
  });

  it("every template is a valid habit", () => {
    for (const template of HABIT_TEMPLATES)
      expect(validateHabitForm(template).ok, template.name).toBe(true);
  });
});
