import { describe, it, expect } from "vitest";
import { analyzePsychology } from "./PsychologyAnalyzer";
import { buildBusinessProfile } from "../builders/BusinessProfileBuilder";
import { buildBusinessIntelligence } from "../builders/BusinessIntelligence";
import { resolveKnowledge } from "../builders/KnowledgeResolver";
import { neutralBusinessIntelligence } from "../testFixtures";
import type { BusinessProfile } from "../types";
import type { BusinessKnowledge } from "../types/knowledge";

function profile(overrides: Partial<BusinessProfile> = {}): BusinessProfile {
  return {
    industry: "generic",
    businessModel: "business",
    primaryGoal: "generate_leads",
    audience: "General audience",
    tone: "modern",
    priceLevel: "medium",
    ...overrides,
  };
}

const KNOWLEDGE: BusinessKnowledge = resolveKnowledge("generic");

describe("analyzePsychology - objections now driven by BusinessIntelligenceProfile, not just BusinessProfile", () => {
  it("gives an exclusivity-framed price objection for high pricePositioning", () => {
    const bi = neutralBusinessIntelligence({ pricePositioning: 0.85 });
    const psychology = analyzePsychology(profile(), KNOWLEDGE, bi);
    expect(psychology.objections[0]).toMatch(/exclusivity/);
  });

  it("gives a quality-doubt price objection for low pricePositioning", () => {
    const bi = neutralBusinessIntelligence({ pricePositioning: 0.15 });
    const psychology = analyzePsychology(profile(), KNOWLEDGE, bi);
    expect(psychology.objections[0]).toMatch(/lower quality/);
  });

  it("gives a comparison-shopping objection in the middle of the pricePositioning range", () => {
    const bi = neutralBusinessIntelligence({ pricePositioning: 0.5 });
    const psychology = analyzePsychology(profile(), KNOWLEDGE, bi);
    expect(psychology.objections[0]).toMatch(/shop around/);
  });

  it("adds a commitment-size objection when riskPerception is high", () => {
    const bi = neutralBusinessIntelligence({ riskPerception: 0.8 });
    const psychology = analyzePsychology(profile(), KNOWLEDGE, bi);
    expect(psychology.objections.some((o) => o.includes("size of the commitment"))).toBe(true);
  });

  it("adds an overwhelm objection when decisionComplexity is high", () => {
    const bi = neutralBusinessIntelligence({ riskPerception: 0.3, decisionComplexity: 0.8 });
    const psychology = analyzePsychology(profile(), KNOWLEDGE, bi);
    expect(psychology.objections.some((o) => o.includes("overwhelmed"))).toBe(true);
  });

  it("adds no risk/complexity objection when both are low - fewer objections, not a fabricated one", () => {
    const bi = neutralBusinessIntelligence({ riskPerception: 0.2, decisionComplexity: 0.2 });
    const psychology = analyzePsychology(profile(), KNOWLEDGE, bi);
    expect(psychology.objections.some((o) => o.includes("size of the commitment") || o.includes("overwhelmed"))).toBe(false);
  });
});

describe("analyzePsychology - trust factors and emotional triggers now read BusinessIntelligenceProfile", () => {
  it("adds an authority-driven trust factor when authorityRequirement is high", () => {
    const bi = neutralBusinessIntelligence({ authorityRequirement: 0.8 });
    const psychology = analyzePsychology(profile(), KNOWLEDGE, bi);
    expect(psychology.trustFactors.some((f) => f.includes("credentials"))).toBe(true);
  });

  it("adds a trust-is-hard-earned factor when trustDifficulty is high", () => {
    const bi = neutralBusinessIntelligence({ trustDifficulty: 0.8 });
    const psychology = analyzePsychology(profile(), KNOWLEDGE, bi);
    expect(psychology.trustFactors.some((f) => f.includes("harder to earn"))).toBe(true);
  });

  it("adds an emotional trigger for high emotionalVsRational, a rational one for low", () => {
    const emotional = analyzePsychology(profile(), KNOWLEDGE, neutralBusinessIntelligence({ emotionalVsRational: 0.8 }));
    const rational = analyzePsychology(profile(), KNOWLEDGE, neutralBusinessIntelligence({ emotionalVsRational: 0.15 }));
    expect(emotional.emotionalTriggers).toContain("Being moved, not just informed");
    expect(rational.emotionalTriggers).toContain("Clear, measurable proof over emotional appeal");
  });
});

describe("analyzePsychology - the Luxury vs Cheap Wedding Photographer worked example", () => {
  // Same worked example BusinessIntelligence.test.ts uses to prove bi.pricePositioning
  // diverges correctly - this proves that divergence now actually reaches Psychology,
  // closing Signal Trace Audit v1's finding #3.
  const luxuryPrompt =
    "Landing page for a luxury wedding photographer. We offer bespoke, exclusive photography packages " +
    "for high-end weddings, with a curated portfolio, a unique, one-of-a-kind experience, and unforgettable, " +
    "artisan photography that captures memories.";

  const cheapPrompt =
    "Landing page for an affordable wedding photographer. Budget-friendly, cheap photography packages " +
    "for weddings, book now for a same-day discount, simple and quick booking, proven results guaranteed.";

  const luxuryFacts = buildBusinessProfile(luxuryPrompt);
  const cheapFacts = buildBusinessProfile(cheapPrompt);
  const luxuryBi = buildBusinessIntelligence(luxuryPrompt, luxuryFacts);
  const cheapBi = buildBusinessIntelligence(cheapPrompt, cheapFacts);
  const knowledge = resolveKnowledge(luxuryFacts.industry);

  it("still share the same industry (the exact case that makes the old, BI-blind objection identical)", () => {
    expect(luxuryFacts.industry).toBe(cheapFacts.industry);
    expect(luxuryFacts.priceLevel).toBe(cheapFacts.priceLevel);
  });

  it("now produce a different top objection for luxury vs cheap", () => {
    const luxuryPsychology = analyzePsychology(luxuryFacts, knowledge, luxuryBi);
    const cheapPsychology = analyzePsychology(cheapFacts, knowledge, cheapBi);
    expect(luxuryPsychology.objections[0]).not.toBe(cheapPsychology.objections[0]);
    expect(luxuryPsychology.objections[0]).toMatch(/exclusivity/);
  });
});
