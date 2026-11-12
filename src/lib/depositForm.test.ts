import { describe, expect, it } from "vitest";
import { validateDepositForm } from "./depositForm";

const today = "2026-11-11";

describe("validateDepositForm (FIN-07, E7, NFR-07)", () => {
  it("turns the form into a deposit", () => {
    expect(
      validateDepositForm({ amount: "1 000,50", date: today }, today),
    ).toEqual({ ok: true, value: { amount: 100050, date: today } });
  });

  it("accepts a deposit from the past", () => {
    expect(
      validateDepositForm({ amount: "1", date: "2026-01-01" }, today).ok,
    ).toBe(true);
  });

  it("refuses a future date: it would reach the goal and leave P", () => {
    expect(
      validateDepositForm({ amount: "1", date: "2026-11-12" }, today),
    ).toEqual({ ok: false, error: "date" });
  });

  it.each([
    ["amount", { amount: "", date: today }],
    ["amount", { amount: "0", date: today }],
    ["date", { amount: "1", date: "" }],
    ["date", { amount: "1", date: "2026-02-30" }],
  ] as const)("reports %s for %j", (error, values) => {
    expect(validateDepositForm(values, today)).toEqual({ ok: false, error });
  });
});
