import { describe, it, expect } from "vitest";
import { resolvePricingStrategy, describePricingStrategyForPrompt } from "./PricingEngine";
import { neutralBusinessIntelligence as bi, neutralCompositionSignals as signals } from "../testFixtures";

describe("resolvePricingStrategy", () => {
  it("is deterministic - identical inputs always produce the same strategy", () => {
    expect(resolvePricingStrategy(bi(), signals())).toEqual(resolvePricingStrategy(bi(), signals()));
  });

  describe("presentation", () => {
    it("goes custom-quote for a complex offer or decision", () => {
      expect(resolvePricingStrategy(bi({ offerComplexity: 0.7 }), signals()).presentation).toBe("custom-quote");
      expect(resolvePricingStrategy(bi({ decisionComplexity: 0.7 }), signals()).presentation).toBe("custom-quote");
    });

    it("goes tiered-comparison for a premium offer with low price sensitivity", () => {
      expect(
        resolvePricingStrategy(
          bi({ pricePositioning: 0.7, offerComplexity: 0.3, decisionComplexity: 0.3 }),
          signals({ priceSensitivity: 0.2 })
        ).presentation
      ).toBe("tiered-comparison");
    });

    it("falls back to exact-numbers otherwise", () => {
      expect(
        resolvePricingStrategy(
          bi({ pricePositioning: 0.4, offerComplexity: 0.3, decisionComplexity: 0.3 }),
          signals({ priceSensitivity: 0.5 })
        ).presentation
      ).toBe("exact-numbers");
    });
  });

  describe("anchoring", () => {
    it("is true for a premium offer presented with exact numbers or tiers", () => {
      expect(
        resolvePricingStrategy(bi({ pricePositioning: 0.6, offerComplexity: 0.3, decisionComplexity: 0.3 }), signals())
          .anchoring
      ).toBe(true);
    });

    it("is false once presentation is custom-quote, even at high pricePositioning", () => {
      expect(
        resolvePricingStrategy(bi({ pricePositioning: 0.9, offerComplexity: 0.7 }), signals()).anchoring
      ).toBe(false);
    });

    it("is false below the pricePositioning threshold", () => {
      expect(
        resolvePricingStrategy(bi({ pricePositioning: 0.3, offerComplexity: 0.3, decisionComplexity: 0.3 }), signals())
          .anchoring
      ).toBe(false);
    });
  });

  describe("emphasis", () => {
    it("goes understated for high pricePositioning", () => {
      expect(resolvePricingStrategy(bi({ pricePositioning: 0.75 }), signals()).emphasis).toBe("understated");
    });

    it("goes prominent for high priceSensitivity below the pricePositioning threshold", () => {
      expect(resolvePricingStrategy(bi({ pricePositioning: 0.3 }), signals({ priceSensitivity: 0.7 })).emphasis).toBe(
        "prominent"
      );
    });

    it("falls back to standard otherwise", () => {
      expect(resolvePricingStrategy(bi({ pricePositioning: 0.4 }), signals({ priceSensitivity: 0.4 })).emphasis).toBe(
        "standard"
      );
    });
  });
});

describe("describePricingStrategyForPrompt", () => {
  it("includes presentation and emphasis as readable lines", () => {
    const strategy = resolvePricingStrategy(bi(), signals());
    const lines = describePricingStrategyForPrompt(strategy).join("\n");

    expect(lines).toContain(`Pricing presentation: ${strategy.presentation}`);
    expect(lines).toContain(`Pricing emphasis: ${strategy.emphasis}`);
  });

  it("adds an anchoring directive only when anchoring is true", () => {
    const anchored = resolvePricingStrategy(
      bi({ pricePositioning: 0.6, offerComplexity: 0.3, decisionComplexity: 0.3 }),
      signals()
    );
    const notAnchored = resolvePricingStrategy(bi({ pricePositioning: 0.3 }), signals());

    expect(describePricingStrategyForPrompt(anchored).join("\n")).toMatch(/higher-tier anchor/);
    expect(describePricingStrategyForPrompt(notAnchored).join("\n")).not.toMatch(/higher-tier anchor/);
  });
});
