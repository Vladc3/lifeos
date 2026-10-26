import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { useEffect, useState } from "react";
import type { Db } from "../../db/types";
import { cs } from "../../i18n/cs";
import { BudgetSetting } from "./BudgetSetting";
import { CategorySettings } from "./CategorySettings";

// Settings in tabs (v0.2.1): finance now, system grows with check-ins, backup, PIN.
// Budget and categories need the DB, so they wait for it.
export function SettingsScreen({
  db,
  today,
}: {
  db: Db | null;
  today: string;
}) {
  const [tab, setTab] = useState<"finance" | "system">("finance");
  const tabs = ["finance", "system"] as const;

  return (
    <div className="max-w-3xl space-y-8">
      <div role="tablist" className="flex gap-1 border-b border-border">
        {tabs.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`settings-tab-${id}`}
            aria-selected={tab === id}
            aria-controls="settings-panel"
            onClick={() => setTab(id)}
            className="-mb-px border-b-2 border-transparent px-4 py-2 text-text-muted hover:text-text aria-selected:border-text aria-selected:text-text"
          >
            {cs.settings.tabs[id]}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id="settings-panel"
        aria-labelledby={`settings-tab-${tab}`}
        className="space-y-10"
      >
        {tab === "finance" ? (
          db && (
            <>
              <BudgetSetting db={db} />
              <CategorySettings db={db} today={today} />
            </>
          )
        ) : (
          <SystemSettings />
        )}
      </div>
    </div>
  );
}

// SYS-02: the OS is the source of truth, nothing is stored in settings.
function SystemSettings() {
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
  );
}
