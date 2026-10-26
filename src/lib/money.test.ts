import { describe, expect, it } from "vitest";
import {
  formatAmountInput,
  formatMoney,
  parseAmount,
  parseOptionalAmount,
} from "./money";

const NBSP = " ";

describe("parseAmount (FIN-01: > 0, max 2 desetinná místa, čárka i tečka)", () => {
  it.each([
    ["12", 1200],
    ["12,5", 1250],
    ["12.50", 1250],
    ["0,29", 29], // float: 0.29 * 100 = 28.999…
    ["0,1", 10],
    ["0.01", 1],
    ["1 234,50", 123450],
    [`1${NBSP}234,50`, 123450],
    ["  99  ", 9900],
  ])("%j → %d haléřů", (input, halere) => {
    expect(parseAmount(input)).toBe(halere);
  });

  it.each([
    "",
    "   ",
    "abc",
    "0",
    "0,00",
    "-5",
    "+5",
    "1,234", // 3 desetinná místa
    "1.234", // tečka je desetinná, ne tisíce (plán F2, E6)
    "12,",
    ",5",
    "1,2,3",
    "1e3",
    "9007199254740992", // nad Number.MAX_SAFE_INTEGER haléřů
  ])("%j → null", (input) => {
    expect(parseAmount(input)).toBeNull();
  });
});

describe("formatMoney (cs-CZ, haléře jen když nejsou nulové)", () => {
  it.each([
    [100000, `1${NBSP}000${NBSP}Kč`],
    [123450, `1${NBSP}234,50${NBSP}Kč`],
    [12050, `120,50${NBSP}Kč`],
    [5, `0,05${NBSP}Kč`],
    [0, `0${NBSP}Kč`],
  ])("%d → %j", (halere, text) => {
    expect(formatMoney(halere)).toBe(text);
  });

  it("round-trips with parseAmount", () => {
    expect(parseAmount(formatMoney(123450).replace("Kč", ""))).toBe(123450);
  });
});

describe("formatAmountInput (hodnota pole částky při úpravě)", () => {
  it.each([
    [12050, "120,50"],
    [100000, "1000"],
    [5, "0,05"],
    [1, "0,01"],
  ])("%d → %j, and parseAmount reads it back", (halere, text) => {
    expect(formatAmountInput(halere)).toBe(text);
    expect(parseAmount(text)).toBe(halere);
  });
});

describe("parseOptionalAmount (rozpočet a limit: prázdné = bez limitu)", () => {
  it.each([
    ["", 0],
    ["  ", 0],
    ["0", 0],
    ["0,00", 0],
    ["1 500", 150000],
  ])("%j → %d", (input, halere) => {
    expect(parseOptionalAmount(input)).toBe(halere);
  });

  it.each(["-5", "abc", "1,234"])("%j → null", (input) => {
    expect(parseOptionalAmount(input)).toBeNull();
  });
});
