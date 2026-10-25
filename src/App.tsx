import { useEffect, useState } from "react";
import { openDb } from "./db";
import { SettingsScreen } from "./features/settings/SettingsScreen";
import { cs } from "./i18n/cs";
import { MODULES, moduleForShortcut, type ModuleId } from "./lib/shortcuts";

export default function App() {
  const [active, setActive] = useState<ModuleId>("today");
  const [dbError, setDbError] = useState<string | null>(null);

  // openDb() is cached, so later screens get the same instance by calling it again.
  useEffect(() => {
    openDb().catch((error: unknown) => setDbError(String(error)));
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = moduleForShortcut(event);
      if (!target) return;
      event.preventDefault();
      setActive(target);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="grid h-screen grid-cols-[14rem_1fr]">
      <nav
        aria-label={cs.nav}
        className="flex flex-col gap-1 border-r border-border bg-surface p-3"
      >
        <p className="px-3 py-2 text-sm font-semibold text-text-muted">
          {cs.appName}
        </p>
        {MODULES.map((module, index) => (
          <button
            key={module}
            type="button"
            aria-current={module === active ? "page" : undefined}
            onClick={() => setActive(module)}
            className="flex items-center justify-between rounded-md px-3 py-2 text-left hover:bg-border aria-[current=page]:bg-border"
          >
            {cs.modules[module]}
            <kbd className="text-xs text-text-muted">Ctrl+{index + 1}</kbd>
          </button>
        ))}
      </nav>
      <main className="overflow-auto p-8">
        {dbError && (
          <div
            role="alert"
            className="mb-6 rounded-md border border-danger p-4 text-danger"
          >
            <p className="font-semibold">{cs.dbError}</p>
            <p className="mt-1 text-sm text-text-muted">{dbError}</p>
          </div>
        )}
        <h1 className="mb-6 text-4xl font-semibold">{cs.modules[active]}</h1>
        {active === "settings" ? (
          <SettingsScreen />
        ) : (
          <p className="text-text-muted">{cs.placeholder}</p>
        )}
      </main>
    </div>
  );
}
