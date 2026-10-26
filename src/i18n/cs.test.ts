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
