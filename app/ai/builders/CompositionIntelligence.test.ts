import { describe, it, expect } from "vitest";
import { deriveCompositionSignals, describeSignalsForPrompt } from "./CompositionIntelligence";
import type { BusinessProfile } from "../types";
import type { PsychologyProfile } from "../types/psychology";
import type { OfferStrategy } from "../types/offer";
import type { CompositionSignals } from "../types/signals";
import type { BusinessIntelligenceProfile } from "../types/businessIntelligence";

function business(overrides: Partial<BusinessProfile> = {}): BusinessProfile {
  return {
    industry: "startup",
    businessModel: "saas",
    primaryGoal: "generate_leads",
    audience: "Founders",
    tone: "modern",
    priceLevel: "medium",
    ...overrides,
  };
}

function psychology(overrides: Partial<PsychologyProfile> = {}): PsychologyProfile {
  return {
    pains: ["pain"],
    desires: ["desire"],
    objections: ["objection"],
    trustFactors: ["trust"],
    emotionalTriggers: ["trigger"],
    ...overrides,
  };
}

function offer(overrides: Partial<OfferStrategy> = {}): OfferStrategy {
  return {
    primaryCTA: "Get Started",
    valueProposition: "Built for you",
    offerFraming: "Low commitment",
    riskReductionAngle: "No risk",
    ...overrides,
  };
}

// Neutral on every dimension - these tests exercise how business/psychology/offer
// drive the signals, so bi is held at dead center unless a test is specifically about
// the bi blend itself (see the "BusinessIntelligence blend" describe block below).
function intelligence(overrides: Partial<BusinessIntelligenceProfile> = {}): BusinessIntelligenceProfile {
  return {
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
    ...overrides,
  };
}

describe("deriveCompositionSignals", () => {
  it("gives premium, high-stakes-goal businesses a higher trustNeed than low-price, low-stakes ones", () => {
    const premium = deriveCompositionSignals(
      business({ priceLevel: "premium", primaryGoal: "book_consultation" }),
      psychology({ trustFactors: ["a", "b", "c"] }),
      offer(),
      intelligence()
    );
    const low = deriveCompositionSignals(
      business({ priceLevel: "low", primaryGoal: "generate_leads" }),
      psychology({ trustFactors: [] }),
      offer(),
      intelligence()
    );
    expect(premium.trustNeed).toBeGreaterThan(low.trustNeed);
    expect(premium.trustNeed).toBeGreaterThan(0.65);
    expect(low.trustNeed).toBeLessThan(0.4);
  });

  it("gives urgent goals (schedule_call/book_consultation) a higher urgency score than nurture goals", () => {
    const urgent = deriveCompositionSignals(business({ primaryGoal: "schedule_call" }), psychology(), offer(), intelligence());
    const nurture = deriveCompositionSignals(business({ primaryGoal: "collect_emails" }), psychology(), offer(), intelligence());
    expect(urgent.urgency).toBeGreaterThan(nurture.urgency);
  });

  it("gives saas business models higher complexity than local_business", () => {
    const saas = deriveCompositionSignals(business({ businessModel: "saas" }), psychology(), offer(), intelligence());
    const local = deriveCompositionSignals(business({ businessModel: "local_business" }), psychology(), offer(), intelligence());
    expect(saas.complexity).toBeGreaterThan(local.complexity);
  });

  it("falls back gracefully for an unknown businessModel instead of throwing", () => {
    expect(() =>
      deriveCompositionSignals(business({ businessModel: "something-new" }), psychology(), offer(), intelligence())
    ).not.toThrow();
  });

  it("gives more trustFactors a higher socialProofNeed", () => {
    const few = deriveCompositionSignals(business(), psychology({ trustFactors: ["a"] }), offer(), intelligence());
    const many = deriveCompositionSignals(
      business(),
      psychology({ trustFactors: ["a", "b", "c", "d", "e"] }),
      offer(),
      intelligence()
    );
    expect(many.socialProofNeed).toBeGreaterThan(few.socialProofNeed);
  });

  it("gives low-price businesses higher priceSensitivity than high-price ones", () => {
    const low = deriveCompositionSignals(business({ priceLevel: "low" }), psychology(), offer(), intelligence());
    const high = deriveCompositionSignals(business({ priceLevel: "high" }), psychology(), offer(), intelligence());
    expect(low.priceSensitivity).toBeGreaterThan(high.priceSensitivity);
  });

  it("is deterministic - identical inputs always produce identical signals", () => {
    const a = deriveCompositionSignals(business(), psychology(), offer(), intelligence());
    const b = deriveCompositionSignals(business(), psychology(), offer(), intelligence());
    expect(a).toEqual(b);
  });

  it("every signal stays within [0, 1] even at the extremes", () => {
    const signals = deriveCompositionSignals(
      business({ priceLevel: "premium", primaryGoal: "book_consultation", tone: "bold" }),
      psychology({ trustFactors: ["a", "b", "c", "d", "e", "f", "g", "h"] }),
      offer({ riskReductionAngle: "x".repeat(200) }),
      intelligence({ trustDifficulty: 1, authorityRequirement: 1, riskPerception: 1, purchaseUrgency: 1, pricePositioning: 1 })
    );
    for (const value of Object.values(signals)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  describe("BusinessIntelligence blend", () => {
    it("a high-pricePositioning bi lowers priceSensitivity relative to a low-pricePositioning bi, for the same business", () => {
      const luxury = deriveCompositionSignals(business(), psychology(), offer(), intelligence({ pricePositioning: 0.95 }));
      const budget = deriveCompositionSignals(business(), psychology(), offer(), intelligence({ pricePositioning: 0.05 }));
      expect(luxury.priceSensitivity).toBeLessThan(budget.priceSensitivity);
    });

    it("a high trustDifficulty/authorityRequirement/riskPerception bi raises trustNeed for the same business", () => {
      const neutral = deriveCompositionSignals(business(), psychology(), offer(), intelligence());
      const hardToTrust = deriveCompositionSignals(
        business(),
        psychology(),
        offer(),
        intelligence({ trustDifficulty: 0.95, authorityRequirement: 0.95, riskPerception: 0.95 })
      );
      expect(hardToTrust.trustNeed).toBeGreaterThan(neutral.trustNeed);
    });

    it("bi.purchaseUrgency shifts urgency for the same business/goal", () => {
      const low = deriveCompositionSignals(business(), psychology(), offer(), intelligence({ purchaseUrgency: 0.05 }));
      const high = deriveCompositionSignals(business(), psychology(), offer(), intelligence({ purchaseUrgency: 0.95 }));
      expect(high.urgency).toBeGreaterThan(low.urgency);
    });
  });
});

const NEUTRAL: CompositionSignals = {
  trustNeed: 0.5,
  urgency: 0.5,
  complexity: 0.5,
  socialProofNeed: 0.5,
  objectionPressure: 0.5,
  priceSensitivity: 0.5,
};

describe("describeSignalsForPrompt", () => {
  it("produces one readable directive line per signal", () => {
    const lines = describeSignalsForPrompt(NEUTRAL);
    expect(lines.length).toBe(Object.keys(NEUTRAL).length);
    for (const line of lines) {
      expect(line).toMatch(/^\w+: (low|medium|high) - .+/);
    }
  });
});
