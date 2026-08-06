import { describe, it, expect } from "vitest";
import { buildOfferStrategy } from "./OfferBuilder";
import { analyzePsychology } from "../analyzers/PsychologyAnalyzer";
import { buildBusinessProfile } from "./BusinessProfileBuilder";
import { buildBusinessIntelligence } from "./BusinessIntelligence";
import { resolveKnowledge } from "./KnowledgeResolver";
import { neutralBusinessIntelligence } from "../testFixtures";
import type { BusinessProfile } from "../types";
import type { BusinessKnowledge } from "../types/knowledge";
import type { PsychologyProfile } from "../types/psychology";

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

const PSYCHOLOGY: PsychologyProfile = {
  pains: ["A pain"],
  desires: ["A desire"],
  objections: ["An objection"],
  trustFactors: ["A trust factor"],
  emotionalTriggers: ["A trigger"],
};

describe("buildOfferStrategy - offerFraming now driven by BusinessIntelligenceProfile, not just BusinessProfile.priceLevel", () => {
  it("leans into exclusivity for high pricePositioning", () => {
    const bi = neutralBusinessIntelligence({ pricePositioning: 0.85 });
    const offer = buildOfferStrategy(profile(), KNOWLEDGE, PSYCHOLOGY, bi);
    expect(offer.offerFraming).toMatch(/exclusivity/);
  });

  it("justifies the higher price for moderately-high pricePositioning", () => {
    const bi = neutralBusinessIntelligence({ pricePositioning: 0.6 });
    const offer = buildOfferStrategy(profile(), KNOWLEDGE, PSYCHOLOGY, bi);
    expect(offer.offerFraming).toMatch(/justifying the higher price/);
  });

  it("adds no price modifier for low/neutral pricePositioning", () => {
    const bi = neutralBusinessIntelligence({ pricePositioning: 0.3 });
    const offer = buildOfferStrategy(profile(), KNOWLEDGE, PSYCHOLOGY, bi);
    expect(offer.offerFraming).not.toMatch(/exclusivity|justifying the higher price/);
  });
});

describe("buildOfferStrategy - the Luxury vs Cheap Wedding Photographer worked example", () => {
  // The exact bug in Signal Trace Audit v1's finding #3: both prompts share an industry
  // and therefore a fixed BusinessProfile.priceLevel, so the OLD priceLevel-keyed
  // PRICE_FRAMING_MODIFIER produced byte-identical offerFraming for both - even though
  // the BUSINESS INTELLIGENCE section of the same prompt already told the model the
  // opposite about price positioning. This proves that contradiction is gone.
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
  const luxuryPsychology = analyzePsychology(luxuryFacts, knowledge, luxuryBi);
  const cheapPsychology = analyzePsychology(cheapFacts, knowledge, cheapBi);

  it("still share the same priceLevel (the exact case that made offerFraming identical before this fix)", () => {
    expect(luxuryFacts.priceLevel).toBe(cheapFacts.priceLevel);
  });

  it("now produce different offerFraming for luxury vs cheap, despite the shared priceLevel", () => {
    const luxuryOffer = buildOfferStrategy(luxuryFacts, knowledge, luxuryPsychology, luxuryBi);
    const cheapOffer = buildOfferStrategy(cheapFacts, knowledge, cheapPsychology, cheapBi);

    expect(luxuryOffer.offerFraming).not.toBe(cheapOffer.offerFraming);
    expect(luxuryOffer.offerFraming).toMatch(/exclusivity/);
    expect(cheapOffer.offerFraming).not.toMatch(/exclusivity/);
  });
});
