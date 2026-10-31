import { describe, expect, it } from "vitest";
import { cs } from "./cs";

describe("cs.settings.kindChange (O2, české tvary)", () => {
  it.each([
    [1, "Změní se i 1 transakce této kategorie. Pokračovat?"],
    [3, "Změní se i 3 transakce této kategorie. Pokračovat?"],
    [5, "Změní se i 5 transakcí této kategorie. Pokračovat?"],
    [21, "Změní se i 21 transakcí této kategorie. Pokračovat?"],
  ])("%d → %s", (count, text) => {
    expect(cs.settings.kindChange(count)).toBe(text);
  });
});

describe("cs.habits.streak (české tvary dní a týdnů)", () => {
  it.each([
    [1, false, "1 den"],
    [3, false, "3 dny"],
    [5, false, "5 dní"],
    [0, false, "0 dní"],
    [1, true, "1 týden"],
    [2, true, "2 týdny"],
    [12, true, "12 týdnů"],
  ])("%d (týdny: %s) → %s", (count, weeks, text) => {
    expect(cs.habits.streak(count, weeks)).toBe(text);
  });
});
