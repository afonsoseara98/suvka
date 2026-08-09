import { describe, it, expect } from "vitest";
import { tidyPrice, tidyPhoneHref } from "./tidy";

// A real owner filled these three in, one after the other, and got a menu with three
// different price formats on it.
describe("tidyPrice", () => {
  it("writes the three ways people actually type a price the same way", () => {
    expect(tidyPrice("24,00")).toBe("24,00 €");
    expect(tidyPrice("18€")).toBe("18,00 €");
    expect(tidyPrice("4,50 euros")).toBe("4,50 €");
  });

  it.each([
    ["18", "18,00 €"],
    ["18.5", "18,50 €"],
    ["18,5", "18,50 €"],
    ["  18,50 €  ", "18,50 €"],
    ["€18,50", "18,50 €"],
    ["18 EUR", "18,00 €"],
    ["7,25", "7,25 €"],
  ])("normalises %s", (input, expected) => {
    expect(tidyPrice(input)).toBe(expected);
  });

  // The line between formatting and inventing: a number is formatted, a sentence is not.
  it.each(["sob consulta", "a partir de 15 €", "20/30 €", "s/ preço", "PVP"])(
    "leaves %s exactly as written",
    (input) => {
      expect(tidyPrice(input)).toBe(input);
    }
  );

  it("does not round or alter the amount", () => {
    expect(tidyPrice("24,99")).toBe("24,99 €");
    expect(tidyPrice("0,50")).toBe("0,50 €");
  });
});

describe("tidyPhoneHref", () => {
  it("makes a nine-digit Portuguese number dialable from abroad", () => {
    // The tourist standing outside the door in August is the call that pays for the site.
    expect(tidyPhoneHref("234 390 100")).toBe("+351234390100");
    expect(tidyPhoneHref("912345678")).toBe("+351912345678");
  });

  it("leaves a number that already carries its country code alone", () => {
    expect(tidyPhoneHref("+351 234 390 100")).toBe("+351234390100");
    expect(tidyPhoneHref("+44 20 7946 0958")).toBe("+442079460958");
  });

  it("treats 00 as the international prefix it is", () => {
    expect(tidyPhoneHref("00351234390100")).toBe("+351234390100");
  });

  it("does not guess at a number it does not recognise", () => {
    expect(tidyPhoneHref("1820")).toBe("1820");
    expect(tidyPhoneHref("234 390")).toBe("234390");
  });
});
