// Shared test fixtures for BusinessIntelligenceProfile/CompositionSignals - every
// engine test (HeroEngine, TrustEngine, CTAEngine, PricingEngine, plus
// ArchetypeResolver/DesignPlanner/CompositionIntelligence) needs a neutral baseline of
// both to isolate the one dimension it's actually testing. Extracted once the fourth
// near-identical copy of these two object literals was about to be written - the same
// "independent copies drift" reasoning as utils/textMatching.ts and utils/math.ts,
// just for test fixtures instead of production code.
import type { BusinessIntelligenceProfile } from "./types/businessIntelligence";
import type { CompositionSignals } from "./types/signals";

export function neutralBusinessIntelligence(
  overrides: Partial<BusinessIntelligenceProfile> = {}
): BusinessIntelligenceProfile {
  return {
    pricePositioning: 0.45,
    competitionLevel: 0.45,
    visualImportance: 0.45,
    buyerSophistication: 0.45,
    emotionalVsRational: 0.45,
    decisionComplexity: 0.45,
    purchaseUrgency: 0.45,
    offerComplexity: 0.45,
    riskPerception: 0.45,
    trustDifficulty: 0.45,
    authorityRequirement: 0.45,
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

export function neutralCompositionSignals(overrides: Partial<CompositionSignals> = {}): CompositionSignals {
  return {
    trustNeed: 0.5,
    urgency: 0.5,
    complexity: 0.5,
    socialProofNeed: 0.5,
    objectionPressure: 0.5,
    priceSensitivity: 0.5,
    ...overrides,
  };
}
