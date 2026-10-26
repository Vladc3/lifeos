import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { useEffect, useState } from "react";
import type { Db } from "../../db/types";
import { cs } from "../../i18n/cs";
import { BudgetSetting } from "./BudgetSetting";
import { CategorySettings } from "./CategorySettings";

// SYS-02: the OS is the source of truth, nothing is stored in settings.
// Budget and categories need the DB, so they wait for it.
export function SettingsScreen({
  db,
  today,
}: {
  db: Db | null;
  today: string;
}) {
  const [autostart, setAutostart] = useState<boolean | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    isEnabled()
      .then(setAutostart)
      .catch(() => setFailed(true));
  }, []);

  async function toggleAutostart(next: boolean) {
    setFailed(false);
    try {
      await (next ? enable() : disable());
      setAutostart(await isEnabled());
    } catch {
      setFailed(true);
    }
  }

  return (
    <div className="max-w-3xl space-y-10">
      {db && <BudgetSetting db={db} />}
      {db && <CategorySettings db={db} today={today} />}
      <section className="space-y-3">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            className="size-4 accent-success"
            checked={autostart ?? false}
            disabled={autostart === null}
            onChange={(event) => void toggleAutostart(event.target.checked)}
          />
          {cs.settings.autostart}
        </label>
        {failed && (
          <p role="alert" className="text-danger">
            {cs.settings.autostartError}
          </p>
        )}
      </section>
    </div>
  );
}
