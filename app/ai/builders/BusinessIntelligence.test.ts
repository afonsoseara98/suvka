import { describe, it, expect } from "vitest";
import { buildBusinessIntelligence, describeBusinessIntelligenceForPrompt } from "./BusinessIntelligence";
import { buildBusinessProfile } from "./BusinessProfileBuilder";
import type { BusinessProfile } from "../types";
import type { BusinessIntelligenceProfile } from "../types/businessIntelligence";

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

const PRIMARY_DIMENSIONS: (keyof BusinessIntelligenceProfile)[] = [
  "pricePositioning",
  "competitionLevel",
  "visualImportance",
  "buyerSophistication",
  "emotionalVsRational",
  "decisionComplexity",
  "purchaseUrgency",
  "offerComplexity",
  "riskPerception",
  "trustDifficulty",
  "authorityRequirement",
];

describe("buildBusinessIntelligence", () => {
  it("is deterministic - identical inputs always produce identical output", () => {
    const prompt = "A modern SaaS platform for team collaboration";
    const a = buildBusinessIntelligence(prompt, profile());
    const b = buildBusinessIntelligence(prompt, profile());
    expect(a).toEqual(b);
  });

  it("keeps every primary dimension within [0, 1] even under heavy repeated keyword pressure", () => {
    const prompt =
      "luxury premium exclusive bespoke boutique high-end elite artisan curated prestige white-glove upscale " +
      "luxury premium exclusive bespoke boutique high-end elite artisan curated prestige white-glove upscale " +
      "now today limited hurry urgent immediately same-day emergency";
    const bi = buildBusinessIntelligence(prompt, profile());
    for (const dimension of PRIMARY_DIMENSIONS) {
      const value = bi[dimension] as number;
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it("lets industry priors dominate when the prompt text carries no contradicting signal", () => {
    const bland = "Landing page for our clinic";
    const medical = buildBusinessIntelligence(bland, profile({ industry: "medical" }));
    const generic = buildBusinessIntelligence(bland, profile({ industry: "generic" }));

    expect(medical.trustDifficulty).toBeGreaterThan(generic.trustDifficulty);
    expect(medical.authorityRequirement).toBeGreaterThan(generic.authorityRequirement);
    expect(medical.riskPerception).toBeGreaterThan(generic.riskPerception);
  });

  it("lets prompt text override the generic industry's neutral prior for pricePositioning", () => {
    const luxury = buildBusinessIntelligence(
      "An exclusive, bespoke, luxury boutique experience",
      profile({ industry: "generic" })
    );
    const budget = buildBusinessIntelligence(
      "An affordable, cheap, budget-friendly, discount experience",
      profile({ industry: "generic" })
    );

    expect(luxury.pricePositioning).toBeGreaterThan(0.7);
    expect(budget.pricePositioning).toBeLessThan(0.3);
    expect(luxury.pricePositioning).toBeGreaterThan(budget.pricePositioning);
  });

  it("maps primaryGoal to funnelType", () => {
    expect(buildBusinessIntelligence("x", profile({ primaryGoal: "collect_emails" })).funnelType).toBe("lead-generation");
    expect(buildBusinessIntelligence("x", profile({ primaryGoal: "book_consultation" })).funnelType).toBe("booking");
    expect(buildBusinessIntelligence("x", profile({ primaryGoal: "schedule_call" })).funnelType).toBe("booking");
    expect(buildBusinessIntelligence("x", profile({ primaryGoal: "sell_product" })).funnelType).toBe("direct-response");
  });

  it("maps businessModel to lifetimeValue, falling back to one-time for unrecognized models", () => {
    expect(buildBusinessIntelligence("x", profile({ businessModel: "saas" })).lifetimeValue).toBe("recurring-high");
    expect(buildBusinessIntelligence("x", profile({ businessModel: "local_business" })).lifetimeValue).toBe("recurring-low");
    expect(buildBusinessIntelligence("x", profile({ businessModel: "something-new" })).lifetimeValue).toBe("one-time");
  });

  it("never returns an empty trafficSourceSuitability list", () => {
    const bi = buildBusinessIntelligence("A plain, ordinary business", profile());
    expect(bi.trafficSourceSuitability.length).toBeGreaterThan(0);
  });

  // The user's own worked example: two businesses in the same (generic-classified,
  // since "wedding photographer" matches no industry lexicon) industry, sharing the
  // same businessModel/primaryGoal, whose prompts alone should produce meaningfully
  // different strategic reads - the exact gap the BusinessProfile-only pipeline could
  // never close.
  describe("Luxury Wedding Photographer vs Cheap Wedding Photographer", () => {
    const luxuryPrompt =
      "Landing page for a luxury wedding photographer. We offer bespoke, exclusive photography packages " +
      "for high-end weddings, with a curated portfolio, a unique, one-of-a-kind experience, and unforgettable, " +
      "artisan photography that captures memories.";

    const cheapPrompt =
      "Landing page for an affordable wedding photographer. Budget-friendly, cheap photography packages " +
      "for weddings, book now for a same-day discount, simple and quick booking, proven results guaranteed.";

    const luxuryFacts = buildBusinessProfile(luxuryPrompt);
    const cheapFacts = buildBusinessProfile(cheapPrompt);
    const luxury = buildBusinessIntelligence(luxuryPrompt, luxuryFacts);
    const cheap = buildBusinessIntelligence(cheapPrompt, cheapFacts);

    it("classifies both under the same industry/businessModel/primaryGoal (the exact case BusinessProfile alone can't distinguish)", () => {
      expect(luxuryFacts.industry).toBe(cheapFacts.industry);
      expect(luxuryFacts.businessModel).toBe(cheapFacts.businessModel);
      expect(luxuryFacts.primaryGoal).toBe(cheapFacts.primaryGoal);
    });

    it("still produces a meaningfully premium pricePositioning for luxury and a budget one for cheap", () => {
      expect(luxury.pricePositioning).toBeGreaterThan(0.7);
      expect(cheap.pricePositioning).toBeLessThan(0.3);
    });

    it("reads luxury as more emotionally driven and cheap as more urgency-driven", () => {
      expect(luxury.emotionalVsRational).toBeGreaterThan(cheap.emotionalVsRational);
      expect(cheap.purchaseUrgency).toBeGreaterThan(luxury.purchaseUrgency);
    });

    it("derives a different market position and brand personality for each", () => {
      expect(luxury.marketPosition).not.toBe(cheap.marketPosition);
      expect(luxury.brandPersonality).not.toBe(cheap.brandPersonality);
    });

    it("produces two fully distinct BusinessIntelligenceProfiles overall", () => {
      expect(luxury).not.toEqual(cheap);
    });
  });
});

describe("describeBusinessIntelligenceForPrompt", () => {
  const base: BusinessIntelligenceProfile = {
    pricePositioning: 0.5,
    competitionLevel: 0.5,
    visualImportance: 0.5,
    buyerSophistication: 0.5,
    emotionalVsRational: 0.5,
    decisionComplexity: 0.5,
    purchaseUrgency: 0.5,
    offerComplexity: 0.5,
    riskPerception: 0.5,
    trustDifficulty: 0.5,
    authorityRequirement: 0.5,
    marketPosition: "established",
    brandPersonality: "authoritative",
    buyerAwareness: "solution-aware",
    visitorTemperature: "warm",
    salesCycle: "medium",
    conversionStyle: "direct",
    lifetimeValue: "one-time",
    trafficSourceSuitability: ["search"],
    funnelType: "lead-generation",
  };

  it("always includes the core derived-dimension lines", () => {
    const lines = describeBusinessIntelligenceForPrompt(base).join("\n");
    expect(lines).toContain("Market Position: established");
    expect(lines).toContain("Brand Personality: authoritative");
    expect(lines).toContain("Buyer Awareness: solution-aware");
    expect(lines).toContain("Visitor Temperature: warm");
    expect(lines).toContain("Sales Cycle: medium");
    expect(lines).toContain("Funnel Type: lead-generation");
  });

  it("adds a premium-framing directive only when pricePositioning is high", () => {
    const premium = describeBusinessIntelligenceForPrompt({ ...base, pricePositioning: 0.9 }).join("\n");
    const neutral = describeBusinessIntelligenceForPrompt(base).join("\n");
    expect(premium).toMatch(/premium\/luxury/);
    expect(neutral).not.toMatch(/premium\/luxury/);
  });

  it("adds a nurture-sale directive only when conversionStyle is nurture", () => {
    const nurture = describeBusinessIntelligenceForPrompt({ ...base, conversionStyle: "nurture" }).join("\n");
    expect(nurture).toMatch(/nurture sale/);
  });
});
