// Shared test fixtures for BusinessIntelligenceProfile/CompositionSignals - every
// engine test (HeroEngine, TrustEngine, CTAEngine, PricingEngine, plus
// ArchetypeResolver/DesignPlanner/CompositionIntelligence) needs a neutral baseline of
// both to isolate the one dimension it's actually testing. Extracted once the fourth
// near-identical copy of these two object literals was about to be written - the same
// "independent copies drift" reasoning as utils/textMatching.ts and utils/math.ts,
// just for test fixtures instead of production code.
import type { BusinessIntelligenceProfile } from "./types/businessIntelligence";
import type { CompositionSignals } from "./types/signals";
import type { StrategyDNA } from "./types/dna";
import type { GatedRole } from "./builders/LayoutIntelligence";

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

const NEUTRAL_SECTION_WEIGHT: Record<GatedRole, number> = {
  logoCloud: 0.5,
  features: 0.5,
  benefits: 0.5,
  stats: 0.5,
  testimonials: 0.5,
  pricing: 0.5,
  faq: 0.5,
};

export function neutralStrategyDna(overrides: Partial<StrategyDNA> = {}): StrategyDNA {
  return {
    sectionWeight: NEUTRAL_SECTION_WEIGHT,
    urgency: 0.5,
    complexity: 0.5,
    colorTemperature: 0.5,
    saturation: 0.5,
    brightness: 0.3,
    accentIntensity: 0.5,
    roundedness: 0.5,
    elevation: 0.5,
    decorationDensity: 0.5,
    density: 0.5,
    contentWidth: 0.5,
    typeScale: 0.5,
    typeWeight: 0.5,
    heroSplitLean: 0.5,
    heroImageryProminence: 0.5,
    emotionalIntensity: 0.5,
    credibilityRationalLean: 0.5,
    proofDensity: 0.5,
    authorityEmphasis: 0.5,
    objectionProactivity: 0.5,
    ctaUrgency: 0.5,
    ctaCommitmentWeight: 0.5,
    priceEmphasis: 0.5,
    priceAnchoring: 0.5,
    priceComplexityLean: 0.5,
    ...overrides,
  };
}
