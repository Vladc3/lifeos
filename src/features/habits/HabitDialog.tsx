import { useState, type FormEvent } from "react";
import { createHabit } from "../../db/habits";
import type { Db } from "../../db/types";
import { cs } from "../../i18n/cs";
import { todayLocal } from "../../lib/dates";
import {
  HABIT_TEMPLATES,
  emptyHabitForm,
  validateHabitForm,
  type HabitFormValues,
} from "../../lib/habitForm";
import { dialogClass, useModalDialog } from "../useModalDialog";

const t = cs.habits;

/** HAB-01 + HAB-09: new habit, optionally from a template. */
export function HabitDialog(props: {
  db: Db;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { ref, onCancel } = useModalDialog(props.onClose);
  const [values, setValues] = useState<HabitFormValues>(emptyHabitForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (change: Partial<HabitFormValues>) =>
    setValues((v) => ({ ...v, ...change }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    const result = validateHabitForm(values);
    if (!result.ok) {
      setError(t.errors[result.error]);
      return;
    }
    setSaving(true);
    try {
      // "Today" at the moment of saving: the app may run for days (council F3).
      const saved = await createHabit(
        props.db,
        result.value,
        todayLocal(new Date()),
      );
      if (saved === "limit") {
        setError(t.limit);
        setSaving(false);
      } else props.onSaved();
    } catch {
      setError(cs.saveError);
      setSaving(false);
    }
  }

  const measured = values.type !== "check";

  return (
    <dialog
      ref={ref}
      onCancel={onCancel}
      aria-labelledby="habit-title"
      className={dialogClass}
    >
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <h2 id="habit-title" className="text-xl font-semibold">
          {t.newHabit}
        </h2>

        <label className="block">
          <span className="label">{t.template}</span>
          <select
            data-autofocus
            defaultValue=""
            onChange={(e) => {
              const template = HABIT_TEMPLATES[Number(e.target.value)];
              setValues(template ?? emptyHabitForm);
              setError(null);
            }}
            className="field"
          >
            <option value="">{t.noTemplate}</option>
            {HABIT_TEMPLATES.map((template, i) => (
              <option key={template.name} value={i}>
                {template.icon} {template.name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex gap-3">
          <label className="block w-20">
            <span className="label">{t.icon}</span>
            <input
              value={values.icon}
              onChange={(e) => set({ icon: e.target.value })}
              className="field"
            />
          </label>
          <label className="block flex-1">
            <span className="label">{t.name}</span>
            <input
              value={values.name}
              maxLength={40}
              onChange={(e) => set({ name: e.target.value })}
              className="field"
            />
          </label>
        </div>

        <fieldset className="flex flex-wrap gap-x-6 gap-y-2">
          <legend className="label mb-1">{t.type}</legend>
          {(["check", "count", "duration"] as const).map((type) => (
            <label key={type} className="flex items-center gap-2">
              <input
                type="radio"
                name="habit-type"
                checked={values.type === type}
                onChange={() => set({ type })}
                className="accent-text"
              />
              {t.types[type]}
            </label>
          ))}
        </fieldset>

        {measured && (
          <div className="flex gap-3">
            <label className="block flex-1">
              <span className="label">{t.target}</span>
              <input
                inputMode="numeric"
                value={values.target}
                onChange={(e) => set({ target: e.target.value })}
                className="field"
              />
            </label>
            <label className="block flex-1">
              <span className="label">{t.unit}</span>
              <input
                value={values.unit}
                onChange={(e) => set({ unit: e.target.value })}
                className="field"
              />
            </label>
            <label className="block flex-1">
              <span className="label">{t.minValue}</span>
              <input
                inputMode="numeric"
                value={values.minValue}
                onChange={(e) => set({ minValue: e.target.value })}
                className="field"
              />
            </label>
          </div>
        )}

        <fieldset className="space-y-2">
          <legend className="label mb-1">{t.frequency}</legend>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {(["daily", "days", "weekly_count"] as const).map((frequency) => (
              <label key={frequency} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="habit-frequency"
                  checked={values.frequency === frequency}
                  onChange={() => set({ frequency })}
                  className="accent-text"
                />
                {t.frequencies[frequency]}
              </label>
            ))}
          </div>
          {values.frequency === "days" && (
            <div className="flex flex-wrap gap-3">
              {t.weekdays.map((day, bit) => (
                <label key={day} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={((values.daysMask >> bit) & 1) === 1}
                    onChange={() =>
                      set({ daysMask: values.daysMask ^ (1 << bit) })
                    }
                    className="accent-text"
                  />
                  {day}
                </label>
              ))}
            </div>
          )}
          {values.frequency === "weekly_count" && (
            <label className="block w-40">
              <span className="label">{t.weeklyTarget}</span>
              <input
                inputMode="numeric"
                value={values.weeklyTarget}
                onChange={(e) => set({ weeklyTarget: e.target.value })}
                className="field"
              />
            </label>
          )}
        </fieldset>

        <label className="block">
          <span className="label">{t.minVersion}</span>
          <input
            value={values.minVersion}
            onChange={(e) => set({ minVersion: e.target.value })}
            className="field"
          />
        </label>
        <label className="block">
          <span className="label">{t.identity}</span>
          <input
            value={values.identity}
            onChange={(e) => set({ identity: e.target.value })}
            className="field"
          />
        </label>
        <label className="block">
          <span className="label">{t.anchor}</span>
          <input
            value={values.anchor}
            onChange={(e) => set({ anchor: e.target.value })}
            className="field"
          />
        </label>

        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={props.onClose} className="btn">
            {cs.transactionDialog.cancel}
          </button>
          <button type="submit" disabled={saving} className="btn btn-primary">
            {cs.transactionDialog.save}
          </button>
        </div>
      </form>
    </dialog>
  );
}
