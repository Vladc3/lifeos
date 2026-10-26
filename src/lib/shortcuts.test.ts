import { describe, expect, it } from "vitest";
import { moduleForShortcut, type ShortcutEvent } from "./shortcuts";

const press = (
  code: string,
  mods: Partial<ShortcutEvent> = {},
): ShortcutEvent => ({
  code,
  ctrlKey: true,
  shiftKey: false,
  altKey: false,
  metaKey: false,
  ...mods,
});

describe("moduleForShortcut (PRD kap. 8: Ctrl+1 až Ctrl+6)", () => {
  it.each([
    ["Digit1", "today"],
    ["Digit2", "habits"],
    ["Digit3", "finance"],
    ["Digit4", "goals"],
    ["Digit5", "review"],
    ["Digit6", "settings"],
  ] as const)("Ctrl+%s přepne na %s", (code, module) => {
    expect(moduleForShortcut(press(code))).toBe(module);
  });

  it("uses the physical key, so it works on a Czech layout where Ctrl+1 types '+'", () => {
    // event.key would be "+" on cs layout; code stays "Digit1"
    expect(moduleForShortcut(press("Digit1"))).toBe("today");
  });

  it.each([
    ["Ctrl+7", press("Digit7")],
    ["1 bez Ctrl", press("Digit1", { ctrlKey: false })],
    ["Ctrl+Shift+1", press("Digit1", { shiftKey: true })],
    ["Ctrl+Alt+1 (AltGr)", press("Digit1", { altKey: true })],
    ["Ctrl+Meta+1", press("Digit1", { metaKey: true })],
    ["Ctrl+N", press("KeyN")],
  ])("%s nepřepíná modul", (_label, event) => {
    expect(moduleForShortcut(event)).toBeNull();
  });
});
