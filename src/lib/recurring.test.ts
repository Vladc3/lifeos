import { describe, expect, it } from "vitest";
import { dueRuns, firstRunMonth, paymentDate } from "./recurring";

const monthly = (day_of_month: number, first_month: string) => ({
  day_of_month,
  first_month,
  archived_at: null,
});

describe("paymentDate (CALC-11: den 29–31 v kratším měsíci)", () => {
  it.each([
    ["2026-11", 5, "2026-11-05"],
    ["2027-02", 31, "2027-02-28"],
    ["2028-02", 31, "2028-02-29"],
    ["2026-11", 31, "2026-11-30"],
    ["2026-12", 31, "2026-12-31"],
  ])("%s den %i = %s", (month, day, date) => {
    expect(paymentDate(month, day)).toBe(date);
  });
});

describe("firstRunMonth (D1: první platba až na datum ≥ založení)", () => {
  it("skips this month when the day already passed", () => {
    expect(firstRunMonth(5, "2026-11-20")).toBe("2026-12");
  });

  it("keeps this month when the day is today or later", () => {
    expect(firstRunMonth(20, "2026-11-20")).toBe("2026-11");
    expect(firstRunMonth(25, "2026-11-20")).toBe("2026-11");
  });

  it("compares the clamped date: day 31 on the last day of a short month", () => {
    expect(firstRunMonth(31, "2027-02-28")).toBe("2027-02");
    expect(firstRunMonth(31, "2026-11-30")).toBe("2026-11");
  });

  it("rolls over the year", () => {
    expect(firstRunMonth(1, "2026-12-15")).toBe("2027-01");
  });
});

describe("dueRuns (CALC-11)", () => {
  it("fills every month from first_month, the current one only when the day came", () => {
    expect(dueRuns(monthly(5, "2026-09"), [], "2026-11-04")).toEqual([
      { month: "2026-09", date: "2026-09-05" },
      { month: "2026-10", date: "2026-10-05" },
    ]);
    expect(
      dueRuns(monthly(5, "2026-09"), [], "2026-11-05").map((r) => r.month),
    ).toEqual(["2026-09", "2026-10", "2026-11"]);
  });

  it("leaves out months that already have a run", () => {
    expect(
      dueRuns(monthly(5, "2026-09"), ["2026-09", "2026-11"], "2026-11-30"),
    ).toEqual([{ month: "2026-10", date: "2026-10-05" }]);
  });

  it("clamps the day in short months and crosses the year", () => {
    expect(dueRuns(monthly(31, "2026-12"), [], "2027-02-28")).toEqual([
      { month: "2026-12", date: "2026-12-31" },
      { month: "2027-01", date: "2027-01-31" },
      { month: "2027-02", date: "2027-02-28" },
    ]);
  });

  it("gives nothing for an archived payment", () => {
    expect(
      dueRuns(
        { ...monthly(5, "2026-09"), archived_at: "2026-10-01" },
        [],
        "2026-11-30",
      ),
    ).toEqual([]);
  });

  it("gives nothing before first_month", () => {
    expect(dueRuns(monthly(5, "2026-12"), [], "2026-11-30")).toEqual([]);
  });

  it("a later day change does not reopen a month before first_month (E3)", () => {
    // Founded 20. 11. with day 5, so first_month is December; day changed to 25 on 10. 12.
    expect(dueRuns(monthly(25, "2026-12"), ["2026-12"], "2026-12-10")).toEqual(
      [],
    );
  });

  it("moving the day earlier before the run gives one payment this month", () => {
    expect(dueRuns(monthly(5, "2026-12"), [], "2026-12-10")).toEqual([
      { month: "2026-12", date: "2026-12-05" },
    ]);
  });
});
