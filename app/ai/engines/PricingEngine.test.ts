import { describe, it, expect } from "vitest";
import { resolvePricingDNA } from "./PricingEngine";
import { neutralBusinessIntelligence as bi, neutralCompositionSignals as signals } from "../testFixtures";

describe("resolvePricingDNA", () => {
  it("is deterministic - identical inputs always produce the same DNA", () => {
    expect(resolvePricingDNA(bi(), signals())).toEqual(resolvePricingDNA(bi(), signals()));
  });

  it("every field stays within [0, 1] at the extremes", () => {
    const dna = resolvePricingDNA(
      bi({ pricePositioning: 1, offerComplexity: 1, decisionComplexity: 1 }),
      signals({ priceSensitivity: 1 })
    );
    for (const value of Object.values(dna)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  describe("priceComplexityLean", () => {
    it("rises with offerComplexity and decisionComplexity", () => {
      const simple = resolvePricingDNA(bi({ offerComplexity: 0.1, decisionComplexity: 0.1 }), signals());
      const complex = resolvePricingDNA(bi({ offerComplexity: 0.9, decisionComplexity: 0.9 }), signals());
      expect(complex.priceComplexityLean).toBeGreaterThan(simple.priceComplexityLean);
    });
  });

  describe("priceAnchoring", () => {
    it("rises with pricePositioning when the offer stays simple", () => {
      const budget = resolvePricingDNA(bi({ pricePositioning: 0.1, offerComplexity: 0.1, decisionComplexity: 0.1 }), signals());
      const premium = resolvePricingDNA(bi({ pricePositioning: 0.9, offerComplexity: 0.1, decisionComplexity: 0.1 }), signals());
      expect(premium.priceAnchoring).toBeGreaterThan(budget.priceAnchoring);
    });

    it("is scaled down once the offer leans toward a custom quote, even at high pricePositioning", () => {
      const simpleOffer = resolvePricingDNA(bi({ pricePositioning: 0.9, offerComplexity: 0.1, decisionComplexity: 0.1 }), signals());
      const complexOffer = resolvePricingDNA(bi({ pricePositioning: 0.9, offerComplexity: 0.9, decisionComplexity: 0.9 }), signals());
      expect(complexOffer.priceAnchoring).toBeLessThan(simpleOffer.priceAnchoring);
    });
  });

  describe("priceEmphasis", () => {
    it("rises with priceSensitivity and falls with pricePositioning", () => {
      const sensitive = resolvePricingDNA(bi({ pricePositioning: 0.1 }), signals({ priceSensitivity: 0.9 }));
      const premium = resolvePricingDNA(bi({ pricePositioning: 0.9 }), signals({ priceSensitivity: 0.1 }));
      expect(sensitive.priceEmphasis).toBeGreaterThan(premium.priceEmphasis);
    });
  });
});
