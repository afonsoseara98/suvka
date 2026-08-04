import { describe, it, expect } from "vitest";
import { resolveTrustDNA } from "./TrustEngine";
import { neutralBusinessIntelligence as bi, neutralCompositionSignals as signals } from "../testFixtures";

describe("resolveTrustDNA", () => {
  it("is deterministic - identical inputs always produce the same DNA", () => {
    expect(resolveTrustDNA(bi(), signals())).toEqual(resolveTrustDNA(bi(), signals()));
  });

  it("reuses authorityRequirement directly as authorityEmphasis", () => {
    expect(resolveTrustDNA(bi({ authorityRequirement: 0.77 }), signals()).authorityEmphasis).toBe(0.77);
  });

  it("passes socialProofNeed/objectionPressure through as proofDensity/objectionProactivity", () => {
    const dna = resolveTrustDNA(bi(), signals({ socialProofNeed: 0.63, objectionPressure: 0.28 }));
    expect(dna.proofDensity).toBe(0.63);
    expect(dna.objectionProactivity).toBe(0.28);
  });

  it("every field stays within [0, 1] at the extremes", () => {
    const extremeBi = bi({ authorityRequirement: 1, riskPerception: 1, buyerSophistication: 1 });
    const dna = resolveTrustDNA(extremeBi, signals());
    for (const value of Object.values(dna)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  describe("credibilityRationalLean", () => {
    it("rises with authorityRequirement, riskPerception and buyerSophistication", () => {
      const emotional = resolveTrustDNA(
        bi({ authorityRequirement: 0.1, riskPerception: 0.1, buyerSophistication: 0.1 }),
        signals()
      );
      const rational = resolveTrustDNA(
        bi({ authorityRequirement: 0.9, riskPerception: 0.9, buyerSophistication: 0.9 }),
        signals()
      );
      expect(rational.credibilityRationalLean).toBeGreaterThan(emotional.credibilityRationalLean);
    });
  });
});
