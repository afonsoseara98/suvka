import { describe, it, expect } from "vitest";
import { resolveVisualDNA } from "./VisualEngine";
import { neutralBusinessIntelligence as bi } from "../testFixtures";

describe("resolveVisualDNA", () => {
  it("is deterministic - identical inputs always produce the same DNA", () => {
    expect(resolveVisualDNA(bi())).toEqual(resolveVisualDNA(bi()));
  });

  it("every field stays within [0, 1] at the extremes", () => {
    const extremeBi = bi({
      pricePositioning: 1,
      visualImportance: 1,
      emotionalVsRational: 1,
      purchaseUrgency: 1,
      authorityRequirement: 1,
      trustDifficulty: 1,
      decisionComplexity: 1,
      offerComplexity: 1,
    });
    const dna = resolveVisualDNA(extremeBi);
    for (const value of Object.values(dna)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it("gives a high-trust/authority business a cooler, brighter, less saturated palette than a high-emotion/urgency one", () => {
    const clinical = resolveVisualDNA(bi({ trustDifficulty: 0.9, authorityRequirement: 0.9, emotionalVsRational: 0.1, purchaseUrgency: 0.1 }));
    const energetic = resolveVisualDNA(bi({ trustDifficulty: 0.1, authorityRequirement: 0.1, emotionalVsRational: 0.9, purchaseUrgency: 0.9 }));

    expect(clinical.colorTemperature).toBeLessThan(energetic.colorTemperature);
    expect(clinical.brightness).toBeGreaterThan(energetic.brightness);
    expect(clinical.saturation).toBeLessThan(energetic.saturation);
    expect(clinical.decorationDensity).toBeLessThan(energetic.decorationDensity);
  });

  it("gives a premium (high pricePositioning) business more restraint - lower saturation, sharper corners, more whitespace, narrower content", () => {
    const budget = resolveVisualDNA(bi({ pricePositioning: 0.1 }));
    const premium = resolveVisualDNA(bi({ pricePositioning: 0.9 }));

    expect(premium.saturation).toBeLessThan(budget.saturation);
    expect(premium.roundedness).toBeLessThan(budget.roundedness);
    expect(premium.density).toBeLessThan(budget.density);
    expect(premium.contentWidth).toBeLessThan(budget.contentWidth);
  });

  it("gives a complex/custom offer higher density and content width than a simple one", () => {
    const simple = resolveVisualDNA(bi({ decisionComplexity: 0.1, offerComplexity: 0.1 }));
    const complex = resolveVisualDNA(bi({ decisionComplexity: 0.9, offerComplexity: 0.9 }));

    expect(complex.density).toBeGreaterThan(simple.density);
    expect(complex.contentWidth).toBeGreaterThan(simple.contentWidth);
  });
});
