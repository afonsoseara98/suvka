import { describe, it, expect } from "vitest";
import { resolveTrustStrategy, describeTrustStrategyForPrompt } from "./TrustEngine";
import { neutralBusinessIntelligence as bi, neutralCompositionSignals as signals } from "../testFixtures";

describe("resolveTrustStrategy", () => {
  it("is deterministic - identical inputs always produce the same strategy", () => {
    expect(resolveTrustStrategy(bi(), signals())).toEqual(resolveTrustStrategy(bi(), signals()));
  });

  it("reuses authorityRequirement directly as authorityEmphasis", () => {
    expect(resolveTrustStrategy(bi({ authorityRequirement: 0.77 }), signals()).authorityEmphasis).toBe(0.77);
  });

  describe("credibilityApproach", () => {
    it("leads with credentials once authorityRequirement is high", () => {
      expect(resolveTrustStrategy(bi({ authorityRequirement: 0.7 }), signals()).credibilityApproach).toBe(
        "credentials"
      );
    });

    it("leads with data for a high-stakes, sophisticated buyer below the authority threshold", () => {
      expect(
        resolveTrustStrategy(
          bi({ authorityRequirement: 0.3, riskPerception: 0.7, buyerSophistication: 0.6 }),
          signals()
        ).credibilityApproach
      ).toBe("data");
    });

    it("leads with social proof once socialProofNeed clears its threshold", () => {
      expect(
        resolveTrustStrategy(bi({ authorityRequirement: 0.3, riskPerception: 0.3 }), signals({ socialProofNeed: 0.6 }))
          .credibilityApproach
      ).toBe("social-proof");
    });

    it("falls back to a guarantee when nothing else clears its bar", () => {
      expect(
        resolveTrustStrategy(
          bi({ authorityRequirement: 0.3, riskPerception: 0.3 }),
          signals({ socialProofNeed: 0.3 })
        ).credibilityApproach
      ).toBe("guarantee");
    });
  });

  describe("proofDensity", () => {
    it("bands from socialProofNeed", () => {
      expect(resolveTrustStrategy(bi(), signals({ socialProofNeed: 0.8 })).proofDensity).toBe("heavy");
      expect(resolveTrustStrategy(bi(), signals({ socialProofNeed: 0.2 })).proofDensity).toBe("minimal");
      expect(resolveTrustStrategy(bi(), signals({ socialProofNeed: 0.5 })).proofDensity).toBe("moderate");
    });
  });

  describe("objectionHandling", () => {
    it("bands from objectionPressure", () => {
      expect(resolveTrustStrategy(bi(), signals({ objectionPressure: 0.8 })).objectionHandling).toBe("proactive");
      expect(resolveTrustStrategy(bi(), signals({ objectionPressure: 0.2 })).objectionHandling).toBe("minimal");
      expect(resolveTrustStrategy(bi(), signals({ objectionPressure: 0.5 })).objectionHandling).toBe("reactive");
    });
  });
});

describe("describeTrustStrategyForPrompt", () => {
  it("includes every structural field as a readable line", () => {
    const strategy = resolveTrustStrategy(bi(), signals());
    const lines = describeTrustStrategyForPrompt(strategy).join("\n");

    expect(lines).toContain(`Credibility approach: ${strategy.credibilityApproach}`);
    expect(lines).toContain(`Proof density: ${strategy.proofDensity}`);
    expect(lines).toContain(`Objection handling: ${strategy.objectionHandling}`);
  });

  it("adds a credentials directive only at high authorityEmphasis", () => {
    const highAuthority = resolveTrustStrategy(bi({ authorityRequirement: 0.8 }), signals());
    const lowAuthority = resolveTrustStrategy(bi({ authorityRequirement: 0.2 }), signals());

    expect(describeTrustStrategyForPrompt(highAuthority).join("\n")).toMatch(/Credentials\/expertise/);
    expect(describeTrustStrategyForPrompt(lowAuthority).join("\n")).not.toMatch(/Credentials\/expertise/);
  });
});
