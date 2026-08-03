import { describe, it, expect } from "vitest";
import { deriveCompositionSignals, describeSignalsForPrompt } from "./CompositionIntelligence";
import type { BusinessProfile } from "../types";
import type { PsychologyProfile } from "../types/psychology";
import type { OfferStrategy } from "../types/offer";
import type { CompositionSignals } from "../types/signals";

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

describe("deriveCompositionSignals", () => {
  it("gives premium, high-stakes-goal businesses a high trustNeed", () => {
    const signals = deriveCompositionSignals(
      business({ priceLevel: "premium", primaryGoal: "book_consultation" }),
      psychology({ trustFactors: ["a", "b", "c"] }),
      offer()
    );
    expect(signals.trustNeed).toBeGreaterThan(0.7);
  });

  it("gives low-price, low-stakes-goal businesses a lower trustNeed", () => {
    const signals = deriveCompositionSignals(
      business({ priceLevel: "low", primaryGoal: "generate_leads" }),
      psychology({ trustFactors: [] }),
      offer()
    );
    expect(signals.trustNeed).toBeLessThan(0.3);
  });

  it("gives urgent goals (schedule_call/book_consultation) a high urgency score", () => {
    const signals = deriveCompositionSignals(business({ primaryGoal: "schedule_call" }), psychology(), offer());
    expect(signals.urgency).toBeGreaterThanOrEqual(0.8);
  });

  it("gives nurture goals (collect_emails) a low urgency score", () => {
    const signals = deriveCompositionSignals(business({ primaryGoal: "collect_emails" }), psychology(), offer());
    expect(signals.urgency).toBeLessThan(0.3);
  });

  it("gives saas business models higher complexity than local_business", () => {
    const saas = deriveCompositionSignals(business({ businessModel: "saas" }), psychology(), offer());
    const local = deriveCompositionSignals(business({ businessModel: "local_business" }), psychology(), offer());
    expect(saas.complexity).toBeGreaterThan(local.complexity);
  });

  it("falls back gracefully for an unknown businessModel instead of throwing", () => {
    expect(() =>
      deriveCompositionSignals(business({ businessModel: "something-new" }), psychology(), offer())
    ).not.toThrow();
  });

  it("gives more trustFactors a higher socialProofNeed", () => {
    const few = deriveCompositionSignals(business(), psychology({ trustFactors: ["a"] }), offer());
    const many = deriveCompositionSignals(
      business(),
      psychology({ trustFactors: ["a", "b", "c", "d", "e"] }),
      offer()
    );
    expect(many.socialProofNeed).toBeGreaterThan(few.socialProofNeed);
  });

  it("gives low-price businesses higher priceSensitivity than high-price ones", () => {
    const low = deriveCompositionSignals(business({ priceLevel: "low" }), psychology(), offer());
    const high = deriveCompositionSignals(business({ priceLevel: "high" }), psychology(), offer());
    expect(low.priceSensitivity).toBeGreaterThan(high.priceSensitivity);
  });

  it("is deterministic - identical inputs always produce identical signals", () => {
    const a = deriveCompositionSignals(business(), psychology(), offer());
    const b = deriveCompositionSignals(business(), psychology(), offer());
    expect(a).toEqual(b);
  });

  it("every signal stays within [0, 1]", () => {
    const signals = deriveCompositionSignals(
      business({ priceLevel: "premium", primaryGoal: "book_consultation", tone: "bold" }),
      psychology({ trustFactors: ["a", "b", "c", "d", "e", "f", "g", "h"] }),
      offer({ riskReductionAngle: "x".repeat(200) })
    );
    for (const value of Object.values(signals)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
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
