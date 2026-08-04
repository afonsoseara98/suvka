import { describe, it, expect } from "vitest";
import { resolveCtaStrategy, describeCtaStrategyForPrompt } from "./CTAEngine";
import { neutralBusinessIntelligence as bi, neutralCompositionSignals as signals } from "../testFixtures";

describe("resolveCtaStrategy", () => {
  it("is deterministic - identical inputs always produce the same strategy", () => {
    expect(resolveCtaStrategy(bi(), signals())).toEqual(resolveCtaStrategy(bi(), signals()));
  });

  describe("style", () => {
    it("goes urgent once urgency clears its threshold, regardless of complexity", () => {
      expect(resolveCtaStrategy(bi({ decisionComplexity: 0.7 }), signals({ urgency: 0.7 })).style).toBe("urgent");
    });

    it("goes soft for a complex or hard-to-trust decision below the urgency threshold", () => {
      expect(resolveCtaStrategy(bi({ decisionComplexity: 0.6 }), signals({ urgency: 0.3 })).style).toBe("soft");
      expect(resolveCtaStrategy(bi({ trustDifficulty: 0.65 }), signals({ urgency: 0.3 })).style).toBe("soft");
    });

    it("goes direct for a simple, non-urgent decision", () => {
      expect(
        resolveCtaStrategy(bi({ decisionComplexity: 0.3, trustDifficulty: 0.3 }), signals({ urgency: 0.3 })).style
      ).toBe("direct");
    });
  });

  describe("commitmentFraming", () => {
    it("goes considered when risk or complexity is high", () => {
      expect(resolveCtaStrategy(bi({ riskPerception: 0.7 }), signals()).commitmentFraming).toBe("considered");
      expect(resolveCtaStrategy(bi({ decisionComplexity: 0.7 }), signals()).commitmentFraming).toBe("considered");
    });

    it("goes immediate-action under high urgency once risk/complexity are low", () => {
      expect(
        resolveCtaStrategy(bi({ riskPerception: 0.3, decisionComplexity: 0.3 }), signals({ urgency: 0.7 }))
          .commitmentFraming
      ).toBe("immediate-action");
    });

    it("falls back to low-commitment otherwise", () => {
      expect(
        resolveCtaStrategy(bi({ riskPerception: 0.3, decisionComplexity: 0.3 }), signals({ urgency: 0.3 }))
          .commitmentFraming
      ).toBe("low-commitment");
    });
  });

  it("composes tone from style and commitmentFraming rather than a lookup table", () => {
    const urgent = resolveCtaStrategy(bi({ riskPerception: 0.3, decisionComplexity: 0.3 }), signals({ urgency: 0.9 }));
    expect(urgent.tone).toBe("Push for immediate action - frame it as immediate action");
  });
});

describe("describeCtaStrategyForPrompt", () => {
  it("includes style, commitmentFraming and the composed tone", () => {
    const strategy = resolveCtaStrategy(bi(), signals());
    const lines = describeCtaStrategyForPrompt(strategy);

    expect(lines).toContain(`CTA style: ${strategy.style}`);
    expect(lines).toContain(`Commitment framing: ${strategy.commitmentFraming}`);
    expect(lines).toContain(strategy.tone);
  });
});
