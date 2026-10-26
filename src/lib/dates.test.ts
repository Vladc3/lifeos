import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  formatDate,
  formatMonth,
  monthOf,
  shiftMonth,
  todayLocal,
} from "./dates";

describe("todayLocal (CLAUDE.md: YYYY-MM-DD v lokálním čase)", () => {
  let originalTz: string | undefined;
  beforeEach(() => {
    originalTz = process.env.TZ;
    process.env.TZ = "Europe/Prague";
  });
  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it("returns the local day just after midnight, where toISOString is still yesterday", () => {
    const now = new Date("2026-10-25T23:30:00Z"); // 00:30 CET on 26 Oct
    expect(now.toISOString().slice(0, 10)).toBe("2026-10-25");
    expect(todayLocal(now)).toBe("2026-10-26");
  });

  it("pads month and day", () => {
    expect(todayLocal(new Date(2026, 0, 5, 12))).toBe("2026-01-05");
  });
});

describe("months", () => {
  it("monthOf takes YYYY-MM from a date", () => {
    expect(monthOf("2026-10-26")).toBe("2026-10");
  });

  it.each([
    ["2026-10", 1, "2026-11"],
    ["2026-12", 1, "2027-01"],
    ["2027-01", -1, "2026-12"],
    ["2026-10", -10, "2025-12"],
    ["2026-10", 0, "2026-10"],
  ])("shiftMonth(%s, %d) → %s", (month, delta, expected) => {
    expect(shiftMonth(month, delta)).toBe(expected);
  });
});

describe("Czech formatting (NFR-09: Intl cs-CZ)", () => {
  it("formatMonth names the month", () => {
    expect(formatMonth("2026-10")).toBe("říjen 2026");
  });

  it("formatDate is day. month. year", () => {
    expect(formatDate("2026-10-05")).toBe("5. 10. 2026");
  });
});
