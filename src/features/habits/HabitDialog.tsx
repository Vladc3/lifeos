import { useState, type FormEvent } from "react";
import {
  createHabit,
  listHabits,
  listPauses,
  syncPhases,
  updateHabit,
  type Habit,
} from "../../db/habits";
import type { Db } from "../../db/types";
import { cs } from "../../i18n/cs";
import { todayLocal } from "../../lib/dates";
import {
  HABIT_TEMPLATES,
  emptyHabitForm,
  validateHabitForm,
  type HabitFormValues,
} from "../../lib/habitForm";
import { nearestToEstablish } from "../../lib/habits";
import { dialogClass, useModalDialog } from "../useModalDialog";

const t = cs.habits;

/** HAB-05 + P7: why the limit blocks, and which habit gets there first. */
export async function limitMessage(db: Db, today: string): Promise<string> {
  const [habits, pauses] = await Promise.all([listHabits(db), listPauses(db)]);
  const building = habits.filter(
    (h) =>
      h.phase === "building" &&
      !h.archived_at &&
      !pauses.some((p) => p.habit_id === h.id && p.end_date === null),
  );
  const nearest = nearestToEstablish(building, today);
  if (!nearest) return cs.saveError;
  return nearest.gap > 0
    ? t.limitNearest(nearest.name, nearest.gap, nearest.weeks)
    : t.limitConsistency(nearest.name);
}

const formOf = (h: Habit): HabitFormValues => ({
  name: h.name,
  icon: h.icon,
  identity: h.identity ?? "",
  type: h.type,
  target: h.target_value?.toString() ?? "",
  unit: h.unit ?? "",
  frequency: h.frequency,
  daysMask: h.days_mask ?? 0,
  weeklyTarget: h.weekly_target?.toString() ?? "",
  anchor: h.anchor ?? "",
  minVersion: h.min_version ?? "",
  minValue: h.min_value?.toString() ?? "",
});

/** HAB-01 + HAB-09: new habit (optionally from a template); HAB-02: edit. */
export function HabitDialog(props: {
  db: Db;
  habit: Habit | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { habit } = props;
  const { ref, onCancel } = useModalDialog(props.onClose);
  const [values, setValues] = useState<HabitFormValues>(() =>
    habit ? formOf(habit) : emptyHabitForm,
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // P5: a frequency change recalculates the past, so it is confirmed once.
  const [confirmFrequency, setConfirmFrequency] = useState(false);

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
    const v = result.value;
    if (
      habit &&
      !confirmFrequency &&
      (v.frequency !== habit.frequency ||
        v.days_mask !== habit.days_mask ||
        v.weekly_target !== habit.weekly_target)
    ) {
      setConfirmFrequency(true);
      return;
    }
    setSaving(true);
    try {
      // "Today" at the moment of saving: the app may run for days (council F3).
      const today = todayLocal(new Date());
      if (habit) {
        await updateHabit(props.db, habit.id, v);
        props.onSaved();
        return;
      }
      await syncPhases(props.db, today); // the limit must not read a stale phase
      const saved = await createHabit(props.db, v, today);
      if (saved === "limit") {
        setError(await limitMessage(props.db, today));
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
          {habit ? t.editHabit : t.newHabit}
        </h2>

        <label className={habit ? "hidden" : "block"}>
          <span className="label">{t.template}</span>
          <select
            data-autofocus={habit ? undefined : true}
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
              data-autofocus={habit ? true : undefined}
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
                disabled={habit !== null}
                onChange={() => set({ type })}
                className="accent-text"
              />
              {t.types[type]}
            </label>
          ))}
          {habit && (
            <span className="w-full text-sm text-text-muted">
              {t.typeLocked}
            </span>
          )}
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

        {confirmFrequency && (
          <p role="alert" className="text-warning">
            {t.frequencyWarning}
          </p>
        )}
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
            {confirmFrequency ? t.frequencyConfirm : cs.transactionDialog.save}
          </button>
        </div>
      </form>
    </dialog>
  );
}
