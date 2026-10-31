import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { openDb } from "./db";
import type { Habit } from "./db/habits";
import type { Db } from "./db/types";
import { FinanceScreen } from "./features/finance/FinanceScreen";
import {
  TransactionDialog,
  type TransactionDialogState,
} from "./features/finance/TransactionDialog";
import { HabitDialog } from "./features/habits/HabitDialog";
import { HabitsScreen } from "./features/habits/HabitsScreen";
import { SettingsScreen } from "./features/settings/SettingsScreen";
import { cs } from "./i18n/cs";
import { todayLocal } from "./lib/dates";
import {
  MODULES,
  isNewHabitShortcut,
  isNewTransactionShortcut,
  moduleForShortcut,
  type ModuleId,
} from "./lib/shortcuts";

export default function App() {
  const [active, setActive] = useState<ModuleId>("today");
  const [db, setDb] = useState<Db | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<TransactionDialogState | null>(null);
  // HAB-01 new habit ("new") or HAB-02 edit (the habit), null = closed.
  const [habitDialog, setHabitDialog] = useState<Habit | "new" | null>(null);
  // Bumped after every save, so screens reload their data (plan F2, E9).
  const [dataVersion, setDataVersion] = useState(0);
  // Read on every render: a window left open overnight gets the new day.
  const today = todayLocal(new Date());

  // openDb() is cached, so every caller gets the same instance.
  useEffect(() => {
    openDb().then(setDb, (error: unknown) => setDbError(String(error)));
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // E9: no shortcuts while any dialog is open (transaction or category).
      if (document.querySelector("dialog[open]")) return;
      if (isNewHabitShortcut(event)) {
        event.preventDefault();
        setHabitDialog("new");
        return;
      }
      if (isNewTransactionShortcut(event)) {
        event.preventDefault();
        setDialog({ mode: "new", kind: "expense" });
        return;
      }
      const target = moduleForShortcut(event);
      if (!target) return;
      event.preventDefault();
      setActive(target);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // SYS-01 "Nový výdaj" from the tray (plan F2, E8). Rust stores the click,
  // so taking it after listen() also catches a click from before the app loaded.
  useEffect(() => {
    const take = () =>
      invoke<boolean>("take_new_expense").then(
        (requested) =>
          requested &&
          // Never replace or cover an open dialog: an edit would turn into a duplicate.
          !document.querySelector("dialog[open]") &&
          setDialog({ mode: "new", kind: "expense" }),
        () => undefined, // not in Tauri (npm run dev in a browser)
      );
    const unlisten = listen("new-expense", () => void take());
    unlisten.then(take, () => undefined);
    return () =>
      void unlisten.then(
        (stop) => stop(),
        () => undefined,
      );
  }, []);

  // The app lives in the tray for days: coming back reloads the data and
  // generates the payments that came due meanwhile (plan F4, E2).
  useEffect(() => {
    const refresh = () => setDataVersion((v) => v + 1);
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  const changed = () => setDataVersion((v) => v + 1);

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
        {active === "finance" ? (
          db && (
            <FinanceScreen
              db={db}
              today={today}
              dataVersion={dataVersion}
              onNew={() => setDialog({ mode: "new", kind: "expense" })}
              onEdit={(transaction) => setDialog({ mode: "edit", transaction })}
              onChanged={changed}
              onOpenSettings={() => setActive("settings")}
            />
          )
        ) : active === "habits" ? (
          db && (
            <HabitsScreen
              db={db}
              dataVersion={dataVersion}
              onAdd={() => setHabitDialog("new")}
              onEdit={(habit) => setHabitDialog(habit)}
            />
          )
        ) : active === "settings" ? (
          <SettingsScreen db={db} today={today} />
        ) : (
          <p className="text-text-muted">{cs.placeholder}</p>
        )}
      </main>
      {habitDialog && db && (
        <HabitDialog
          key={habitDialog === "new" ? "new" : `edit-${habitDialog.id}`}
          db={db}
          habit={habitDialog === "new" ? null : habitDialog}
          onClose={() => setHabitDialog(null)}
          onSaved={() => {
            setHabitDialog(null);
            changed();
          }}
        />
      )}
      {dialog && db && (
        <TransactionDialog
          key={dialog.mode === "edit" ? `edit-${dialog.transaction.id}` : "new"}
          db={db}
          state={dialog}
          today={today}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            changed();
          }}
        />
      )}
    </div>
  );
}
