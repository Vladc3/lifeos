import { describe, expect, it } from "vitest";
import {
  validateInvestmentForm,
  type InvestmentFormValues,
} from "./investmentForm";

const etf: InvestmentFormValues = {
  name: " ETF ",
  icon: "📈",
  value: "40 000",
  monthlyDeposit: "2 000",
};

describe("validateInvestmentForm (FIN-12, NFR-07)", () => {
  it("turns the form into an account and its value", () => {
    expect(validateInvestmentForm(etf)).toEqual({
      ok: true,
      value: { name: "ETF", icon: "📈", monthly_deposit: 200000 },
      accountValue: 4000000,
    });
  });

  it("empty value and deposit mean 0", () => {
    const result = validateInvestmentForm({
      ...etf,
      value: " ",
      monthlyDeposit: "",
    });
    expect(result).toMatchObject({
      ok: true,
      value: { monthly_deposit: 0 },
      accountValue: 0,
    });
  });

  it.each([
    ["name", { name: "  " }],
    ["name", { name: "x".repeat(41) }],
    ["icon", { icon: " " }],
    ["value", { value: "abc" }],
    ["value", { value: "-1" }],
    ["monthlyDeposit", { monthlyDeposit: "1,234" }],
  ] as const)("reports %s for %j", (error, change) => {
    expect(validateInvestmentForm({ ...etf, ...change })).toEqual({
      ok: false,
      error,
    });
  });
});
