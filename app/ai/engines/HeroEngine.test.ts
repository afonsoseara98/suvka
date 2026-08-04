import { describe, it, expect } from "vitest";
import { resolveHeroStrategy, describeHeroStrategyForPrompt } from "./HeroEngine";
import { neutralBusinessIntelligence as bi, neutralCompositionSignals as signals } from "../testFixtures";

describe("resolveHeroStrategy", () => {
  it("is deterministic - identical inputs always produce the same strategy", () => {
    expect(resolveHeroStrategy(bi(), signals())).toEqual(resolveHeroStrategy(bi(), signals()));
  });

  it("reuses emotionalVsRational directly as emotionalIntensity", () => {
    expect(resolveHeroStrategy(bi({ emotionalVsRational: 0.82 }), signals()).emotionalIntensity).toBe(0.82);
  });

  describe("headlineLength", () => {
    it("goes long when the decision is complex or trust is hard-won", () => {
      expect(resolveHeroStrategy(bi({ decisionComplexity: 0.7 }), signals()).headlineLength).toBe("long");
      expect(resolveHeroStrategy(bi({ trustDifficulty: 0.7 }), signals()).headlineLength).toBe("long");
    });

    it("goes short under high urgency once the decision is simple", () => {
      expect(
        resolveHeroStrategy(bi({ decisionComplexity: 0.3, trustDifficulty: 0.3 }), signals({ urgency: 0.7 })).headlineLength
      ).toBe("short");
    });

    it("falls back to medium otherwise", () => {
      expect(resolveHeroStrategy(bi(), signals()).headlineLength).toBe("medium");
    });
  });

  describe("imagery", () => {
    it("goes immersive when visual and emotional both run high", () => {
      expect(resolveHeroStrategy(bi({ visualImportance: 0.7, emotionalVsRational: 0.6 }), signals()).imagery).toBe(
        "immersive"
      );
    });

    it("goes data-focused for a complex offer with low visual weight", () => {
      expect(
        resolveHeroStrategy(bi({ offerComplexity: 0.7, visualImportance: 0.3 }), signals()).imagery
      ).toBe("data-focused");
    });

    it("goes minimal when nothing pulls toward visuals or complexity", () => {
      expect(resolveHeroStrategy(bi({ visualImportance: 0.2 }), signals()).imagery).toBe("minimal");
    });
  });

  describe("whitespace", () => {
    it("goes airy for high price positioning", () => {
      expect(resolveHeroStrategy(bi({ pricePositioning: 0.75 }), signals()).whitespace).toBe("airy");
    });

    it("goes dense for high urgency with a simple decision", () => {
      expect(
        resolveHeroStrategy(bi({ pricePositioning: 0.3, decisionComplexity: 0.3 }), signals({ urgency: 0.7 })).whitespace
      ).toBe("dense");
    });
  });

  describe("proofPlacement", () => {
    it("goes immediate when trust or social proof need is high", () => {
      expect(resolveHeroStrategy(bi(), signals({ trustNeed: 0.75 })).proofPlacement).toBe("immediate");
      expect(resolveHeroStrategy(bi(), signals({ trustNeed: 0.3, socialProofNeed: 0.75 })).proofPlacement).toBe(
        "immediate"
      );
    });

    it("goes deferred when trust need is low", () => {
      expect(resolveHeroStrategy(bi(), signals({ trustNeed: 0.2, socialProofNeed: 0.2 })).proofPlacement).toBe(
        "deferred"
      );
    });
  });
});

describe("describeHeroStrategyForPrompt", () => {
  it("includes every structural field as a readable line", () => {
    const strategy = resolveHeroStrategy(bi(), signals());
    const lines = describeHeroStrategyForPrompt(strategy).join("\n");

    expect(lines).toContain(`Headline length: ${strategy.headlineLength}`);
    expect(lines).toContain(`Hero imagery: ${strategy.imagery}`);
    expect(lines).toContain(`Whitespace: ${strategy.whitespace}`);
    expect(lines).toContain(`Proof placement: ${strategy.proofPlacement}`);
  });

  it("adds an emotional-pull directive only at high emotionalIntensity", () => {
    const emotional = resolveHeroStrategy(bi({ emotionalVsRational: 0.8 }), signals());
    const rational = resolveHeroStrategy(bi({ emotionalVsRational: 0.2 }), signals());

    expect(describeHeroStrategyForPrompt(emotional).join("\n")).toMatch(/emotional pull/);
    expect(describeHeroStrategyForPrompt(rational).join("\n")).toMatch(/rational and concrete/);
  });
});
