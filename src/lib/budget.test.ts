import { describe, expect, it } from "vitest";
import { budgetLevel } from "./budget";

// FIN-04: zelená do 80 %, oranžová 80–100 %, červená nad 100 %
describe("budgetLevel (FIN-04)", () => {
  const limit = 100000; // 1 000 Kč

  it.each([
    [0, "ok"],
    [80000, "ok"], // přesně 80 %
    [80001, "warning"],
    [100000, "warning"], // přesně 100 %
    [100001, "over"],
    [250000, "over"],
  ] as const)("%d haléřů z 1 000 Kč → %s", (spent, level) => {
    expect(budgetLevel(spent, limit)).toBe(level);
  });

  it("has no level when the limit is 0 (bez limitu, žádný bar)", () => {
    expect(budgetLevel(5000, 0)).toBeNull();
  });

  it("keeps the 80 % boundary exact for limits that are not round", () => {
    // 80 % of 333 is 266.4: 266 is ok, 267 is over 80 %
    expect(budgetLevel(266, 333)).toBe("ok");
    expect(budgetLevel(267, 333)).toBe("warning");
  });
});
