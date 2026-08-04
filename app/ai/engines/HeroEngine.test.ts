import { describe, it, expect } from "vitest";
import { resolveHeroDNA } from "./HeroEngine";
import { neutralBusinessIntelligence as bi } from "../testFixtures";

describe("resolveHeroDNA", () => {
  it("is deterministic - identical inputs always produce the same DNA", () => {
    expect(resolveHeroDNA(bi())).toEqual(resolveHeroDNA(bi()));
  });

  it("reuses emotionalVsRational directly as emotionalIntensity", () => {
    expect(resolveHeroDNA(bi({ emotionalVsRational: 0.82 })).emotionalIntensity).toBe(0.82);
  });

  it("every field stays within [0, 1] at the extremes", () => {
    const extremeBi = bi({
      pricePositioning: 1,
      decisionComplexity: 1,
      offerComplexity: 1,
      visualImportance: 1,
      emotionalVsRational: 1,
    });
    const dna = resolveHeroDNA(extremeBi);
    for (const value of Object.values(dna)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  describe("heroSplitLean", () => {
    it("rises with decisionComplexity and offerComplexity", () => {
      const simple = resolveHeroDNA(bi({ decisionComplexity: 0.2, offerComplexity: 0.2 }));
      const complex = resolveHeroDNA(bi({ decisionComplexity: 0.8, offerComplexity: 0.8 }));
      expect(complex.heroSplitLean).toBeGreaterThan(simple.heroSplitLean);
    });

    it("falls as pricePositioning rises, pulling back toward restraint", () => {
      const budget = resolveHeroDNA(bi({ pricePositioning: 0.1 }));
      const premium = resolveHeroDNA(bi({ pricePositioning: 0.9 }));
      expect(premium.heroSplitLean).toBeLessThan(budget.heroSplitLean);
    });
  });

  describe("heroImageryProminence", () => {
    it("rises with visualImportance and emotionalVsRational", () => {
      const low = resolveHeroDNA(bi({ visualImportance: 0.1, emotionalVsRational: 0.1 }));
      const high = resolveHeroDNA(bi({ visualImportance: 0.9, emotionalVsRational: 0.9 }));
      expect(high.heroImageryProminence).toBeGreaterThan(low.heroImageryProminence);
    });
  });
});
