import { describe, it, expect } from "vitest";
import { resolveCtaDNA } from "./CTAEngine";
import { neutralBusinessIntelligence as bi, neutralCompositionSignals as signals } from "../testFixtures";

describe("resolveCtaDNA", () => {
  it("is deterministic - identical inputs always produce the same DNA", () => {
    expect(resolveCtaDNA(bi(), signals())).toEqual(resolveCtaDNA(bi(), signals()));
  });

  it("passes signals.urgency through directly as ctaUrgency", () => {
    expect(resolveCtaDNA(bi(), signals({ urgency: 0.73 })).ctaUrgency).toBe(0.73);
  });

  it("every field stays within [0, 1] at the extremes", () => {
    const dna = resolveCtaDNA(bi({ riskPerception: 1, decisionComplexity: 1 }), signals({ urgency: 1 }));
    for (const value of Object.values(dna)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  describe("ctaCommitmentWeight", () => {
    it("rises with riskPerception and decisionComplexity", () => {
      const low = resolveCtaDNA(bi({ riskPerception: 0.1, decisionComplexity: 0.1 }), signals());
      const high = resolveCtaDNA(bi({ riskPerception: 0.9, decisionComplexity: 0.9 }), signals());
      expect(high.ctaCommitmentWeight).toBeGreaterThan(low.ctaCommitmentWeight);
    });
  });
});
