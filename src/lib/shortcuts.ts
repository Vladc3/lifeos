export const MODULES = [
  "today",
  "habits",
  "finance",
  "goals",
  "review",
  "settings",
] as const;
export type ModuleId = (typeof MODULES)[number];

export interface ShortcutEvent {
  code: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}

// Physical key (code), not event.key: on the Czech layout Ctrl+1 produces "+".
export function moduleForShortcut(event: ShortcutEvent): ModuleId | null {
  if (!event.ctrlKey || event.shiftKey || event.altKey || event.metaKey)
    return null;
  const match = /^Digit([1-6])$/.exec(event.code);
  return match ? MODULES[Number(match[1]) - 1] : null;
}

/** Ctrl+N: new transaction from anywhere (FIN-01). Ctrl+Shift+N is reserved for a new habit. */
export function isNewTransactionShortcut(event: ShortcutEvent): boolean {
  return (
    event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey &&
    !event.metaKey &&
    event.code === "KeyN"
  );
}

/** Ctrl+Shift+N: new habit (PRD kap. 8, HAB-01). */
export function isNewHabitShortcut(event: ShortcutEvent): boolean {
  return (
    event.ctrlKey &&
    event.shiftKey &&
    !event.altKey &&
    !event.metaKey &&
    event.code === "KeyN"
  );
}
